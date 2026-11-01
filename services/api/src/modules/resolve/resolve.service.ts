import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { RealtimeService } from '../realtime/realtime.service';
import { StorageService } from '../storage/storage.interface';
import { STORAGE_SERVICE } from '../storage/storage.module';
import { decide } from '@swiggy/engines';
import type { IssueKind, FairnessDecision, Paise } from '@swiggy/types';

// CONSTRAINTS §4.16: MIME and size validation for uploads
const ALLOWED_MIMES = (process.env['UPLOAD_ALLOWED_MIMES'] ?? 'image/jpeg,image/png,image/webp').split(',');
const MAX_SIZE = parseInt(process.env['UPLOAD_MAX_SIZE_BYTES'] ?? '2097152', 10); // 2 MB

@Injectable()
export class ResolveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly realtime: RealtimeService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
  ) {}

  async createCase(userId: string, orderId: string, issue: IssueKind) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new BadRequestException('Not your order');

    // Prevent duplicate draft cases
    const existing = await this.prisma.resolveCase.findFirst({
      where: { orderId, userId, status: { in: ['draft', 'checking', 'offered'] } },
    });
    if (existing) return existing;

    return this.prisma.resolveCase.create({
      data: { orderId, userId, issue, status: 'draft' },
    });
  }

  async addEvidence(
    caseId: string,
    userId: string,
    file?: Express.Multer.File,
    lineItemIds?: string[],
  ) {
    const resolveCase = await this.prisma.resolveCase.findUnique({ where: { id: caseId } });
    if (!resolveCase) throw new NotFoundException('Case not found');
    if (resolveCase.userId !== userId) throw new BadRequestException('Not your case');

    if (file) {
      // CONSTRAINTS §4.16: validate MIME and size
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        throw new UnsupportedMediaTypeException(`File type ${file.mimetype} is not allowed`);
      }
      if (file.size > MAX_SIZE) {
        throw new PayloadTooLargeException(`File exceeds 2 MB limit`);
      }

      // Store file in durable storage (Supabase in prod, local in dev)
      const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storagePath = `${caseId}/${filename}`;

      try {
        const { path: storedPath } = await this.storageService.upload(
          storagePath,
          file.buffer,
          file.mimetype,
        );

        await this.prisma.evidence.create({
          data: { caseId, kind: 'photo', url: storedPath, verdict: 'pending' },
        });
      } catch (err: any) {
        await this.storageService.delete(storagePath).catch(() => {});
        throw err;
      }
    }

    if (lineItemIds && lineItemIds.length > 0) {
      await this.prisma.evidence.create({
        data: { caseId, kind: 'line_item', payload: lineItemIds, verdict: 'pending' },
      });
    }

    return { ok: true };
  }

  /**
   * Preview entitlement before submission.
   * CONSTRAINTS §5.18: show exact amount+destination BEFORE customer commits.
   */
  async previewDecision(caseId: string, userId: string): Promise<FairnessDecision> {
    const resolveCase = await this.prisma.resolveCase.findUnique({
      where: { id: caseId },
      include: { evidence: true, order: { include: { items: true } } },
    });
    if (!resolveCase) throw new NotFoundException('Case not found');
    if (resolveCase.userId !== userId) throw new BadRequestException('Not your case');

    return this.runEngine(resolveCase, userId);
  }

  /** Customer explicitly submits and runs the engine, storing the decision */
  async submitCase(caseId: string, userId: string) {
    const resolveCase = await this.prisma.resolveCase.findUnique({
      where: { id: caseId },
      include: { evidence: true, order: { include: { items: true } } },
    });
    if (!resolveCase) throw new NotFoundException('Case not found');
    if (resolveCase.userId !== userId) throw new BadRequestException('Not your case');
    if (resolveCase.status !== 'draft') throw new ConflictException('Case already submitted');

    // Mock vision verdicts for photo evidence (D7: MockVisionProvider)
    for (const ev of resolveCase.evidence) {
      if (ev.kind === 'photo' && ev.verdict === 'pending') {
        // Deterministic mock: always returns mismatch_verified for wrong_item, quality_verified for quality
        const mockVerdict =
          resolveCase.issue === 'wrong_item'
            ? 'mismatch_verified'
            : resolveCase.issue === 'quality'
              ? 'quality_verified'
              : 'ambiguous';

        await this.prisma.evidence.update({
          where: { id: ev.id },
          data: { verdict: mockVerdict },
        });
        ev.verdict = mockVerdict; // Update in-memory for engine
      }
      if (ev.kind === 'line_item') {
        await this.prisma.evidence.update({ where: { id: ev.id }, data: { verdict: 'mismatch_verified' } });
        ev.verdict = 'mismatch_verified';
      }
    }

    const decision = await this.runEngine(resolveCase, userId);

    await this.prisma.resolveCase.update({
      where: { id: caseId },
      data: {
        status: decision.confidence === 'low' ? 'checking' : 'offered',
        confidence: decision.confidence,
        decisionJson: decision as object,
      },
    });

    if (decision.confidence === 'low') {
      // Auto-escalate low confidence
      await this.escalateCase(caseId, userId);
    }

    return decision;
  }

  /** Customer accepts the automated resolution */
  async acceptCase(caseId: string, userId: string) {
    const resolveCase = await this.prisma.resolveCase.findUnique({
      where: { id: caseId },
      include: { order: true },
    });
    if (!resolveCase) throw new NotFoundException('Case not found');
    if (resolveCase.userId !== userId) throw new BadRequestException('Not your case');
    if (resolveCase.status !== 'offered') throw new ConflictException('Case cannot be accepted in current state');

    const decision = (resolveCase.decisionJson as unknown) as FairnessDecision;

    await this.prisma.$transaction(async (tx) => {
      await tx.resolveCase.update({ where: { id: caseId }, data: { status: 'accepted' } });

      // Write ledger entry for the compensation
      await this.ledger.append({
        orderId: resolveCase.orderId,
        cause: 'restaurant',
        actor: userId,
        kind: decision.destination === 'source' ? 'refund' : 'credit',
        amountPaise: decision.total,
        destination: decision.destination,
        note: `Resolve: ${decision.outcome} — ${decision.reason}`,
        evidenceRefs: [caseId],
      });
    });

    // Notify customer
    this.realtime.emitToUser(userId, {
      t: 'case.updated',
      caseId,
      status: 'accepted',
    });

    return { ok: true };
  }

  /** Customer escalates to human agent */
  async escalateCase(caseId: string, userId: string) {
    const resolveCase = await this.prisma.resolveCase.findUnique({ where: { id: caseId } });
    if (!resolveCase) throw new NotFoundException('Case not found');

    await this.prisma.resolveCase.update({
      where: { id: caseId },
      data: { status: 'escalated' },
    });

    // Notify agent queue
    const decision = resolveCase.decisionJson as FairnessDecision | null;
    this.realtime.emitToAgentQueue({
      t: 'agent.case.new',
      caseId,
      issueKind: resolveCase.issue,
      confidence: decision?.confidence ?? 'low',
      totalPaise: decision?.total ?? 0,
    });

    return { ok: true };
  }

  async getCasesForCustomer(userId: string) {
    const cases = await this.prisma.resolveCase.findMany({
      where: { userId },
      include: { evidence: true, order: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      cases.map(async (c) => {
        const enrichedEvidence = await Promise.all(
          c.evidence.map(async (ev) => {
            if (ev.kind === 'photo' && ev.url) {
              try {
                const signed = await this.storageService.getSignedUrl(ev.url);
                return { ...ev, url: signed };
              } catch {
                return ev;
              }
            }
            return ev;
          }),
        );
        return { ...c, evidence: enrichedEvidence };
      }),
    );
  }

  async getCaseById(caseId: string, userId: string) {
    const resolveCase = await this.prisma.resolveCase.findUnique({
      where: { id: caseId },
      include: { evidence: true, order: { include: { items: true } } },
    });
    if (!resolveCase) throw new NotFoundException('Case not found');
    if (resolveCase.userId !== userId) throw new BadRequestException('Not your case');

    const enrichedEvidence = await Promise.all(
      resolveCase.evidence.map(async (ev) => {
        if (ev.kind === 'photo' && ev.url) {
          try {
            const signed = await this.storageService.getSignedUrl(ev.url);
            return { ...ev, url: signed };
          } catch {
            return ev;
          }
        }
        return ev;
      }),
    );

    return { ...resolveCase, evidence: enrichedEvidence };
  }

  async getEvidenceSignedUrl(caseId: string, evidenceId: string, userId: string, role: string) {
    const resolveCase = await this.prisma.resolveCase.findUnique({ where: { id: caseId } });
    if (!resolveCase) throw new NotFoundException('Case not found');
    if (role !== 'agent' && resolveCase.userId !== userId) {
      throw new BadRequestException('Not authorized to access evidence for this case');
    }

    const evidence = await this.prisma.evidence.findFirst({
      where: { id: evidenceId, caseId },
    });
    if (!evidence || !evidence.url) {
      throw new NotFoundException('Evidence photo not found');
    }

    const signedUrl = await this.storageService.getSignedUrl(evidence.url);
    return { signedUrl };
  }

  private async runEngine(
    resolveCase: any,
    userId: string,
  ): Promise<FairnessDecision> {
    const order = resolveCase.order;
    const history = await this.getCustomerHistory(userId);

    const claimedItems = (resolveCase.evidence as any[])
      .filter((e: any) => e.kind === 'line_item' && Array.isArray(e.payload))
      .flatMap((e: any) =>
        (e.payload as string[]).map((itemId) => {
          const item = order.items.find((i: any) => i.id === itemId);
          return item ? { name: item.name, pricePaise: item.pricePaise as Paise, qty: item.qty } : null;
        }),
      )
      .filter((item): item is { name: string; pricePaise: Paise; qty: number } => item !== null);

    const claim = {
      issueKind: resolveCase.issue,
      claimedItems,
      evidence: (resolveCase.evidence as any[]).map((e: any) => ({
        kind: e.kind,
        verdict: e.verdict !== 'pending' ? e.verdict : undefined,
      })),
    };

    const orderSnapshot = {
      id: order.id,
      totalPaise: order.totalPaise as Paise,
      deliveryFeePaise: order.deliveryFeePaise as Paise,
      promisedAt: order.promisedAt,
      deliveredAt: order.deliveredAt ?? undefined,
      items: order.items.map((i: any) => ({
        name: i.name,
        pricePaise: i.pricePaise as Paise,
        qty: i.qty,
      })),
    };

    return decide(claim, orderSnapshot, history);
  }

  private async getCustomerHistory(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [orderCount, caseCount, creditEntries] = await Promise.all([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.resolveCase.count({ where: { userId } }),
      this.prisma.ledgerEntry.findMany({
        where: {
          order: { userId },
          kind: 'credit',
          at: { gte: thirtyDaysAgo },
        },
        select: { amountPaise: true },
      }),
    ]);

    const rollingCreditPaise = creditEntries.reduce((sum, e) => sum + e.amountPaise, 0);

    return {
      claimCount: caseCount,
      totalOrders: orderCount,
      rollingCreditPaise: rollingCreditPaise as Paise,
    };
  }
}
