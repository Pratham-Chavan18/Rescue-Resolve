import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { AgentAction, FairnessDecision, Paise } from '@swiggy/types';

const VALID_REASON_CODES = [
  'verified_by_agent',
  'custom_investigation',
  'policy_exception',
  'insufficient_evidence',
  'duplicate_claim',
  'outside_policy',
  'customer_error',
];

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly realtime: RealtimeService,
  ) {}

  async getCaseQueue() {
    return this.prisma.resolveCase.findMany({
      where: { status: 'escalated' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        order: { include: { items: true, restaurant: { select: { id: true, name: true, issueRate: true } } } },
        evidence: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getCasePack(caseId: string) {
    const resolveCase = await this.prisma.resolveCase.findUnique({
      where: { id: caseId },
      include: {
        customer: { select: { id: true, name: true, upiMasked: true } },
        order: {
          include: {
            items: true,
            restaurant: { select: { id: true, name: true, issueRate: true } },
            ledgerEntries: { orderBy: { at: 'asc' } },
          },
        },
        evidence: true,
      },
    });
    if (!resolveCase) throw new NotFoundException('Case not found');
    return resolveCase;
  }

  /**
   * Agent action — approve, custom refund, or reject with reason code.
   * Every action writes a ledger entry (CONSTRAINTS §5.18).
   * CONSTRAINTS §5.19: fraud signals never auto-reject — only route to review.
   */
  async takeAction(
    caseId: string,
    agentId: string,
    action: AgentAction,
    reasonCode: string,
    customAmountPaise?: number,
    note?: string,
  ) {
    if (!VALID_REASON_CODES.includes(reasonCode)) {
      throw new BadRequestException(`Invalid reason code. Valid: ${VALID_REASON_CODES.join(', ')}`);
    }

    const resolveCase = await this.prisma.resolveCase.findUnique({
      where: { id: caseId },
      include: { order: true },
    });
    if (!resolveCase) throw new NotFoundException('Case not found');
    if (resolveCase.status !== 'escalated') {
      throw new BadRequestException('Case is not in escalated state');
    }

    const decision = resolveCase.decisionJson as FairnessDecision | null;

    let finalAmount = 0;
    let finalDestination: 'source' | 'wallet' = 'wallet';

    if (action === 'approve' && decision) {
      finalAmount = decision.total;
      finalDestination = decision.destination;
    } else if (action === 'custom_refund') {
      if (!customAmountPaise || !Number.isInteger(customAmountPaise)) {
        throw new BadRequestException('custom_refund requires integer amountPaise');
      }
      finalAmount = customAmountPaise;
      finalDestination = 'source';
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.resolveCase.update({
        where: { id: caseId },
        data: {
          status: action === 'reject' ? 'rejected' : 'resolved',
          agentId,
          agentAction: action,
          agentReasonCode: reasonCode,
          agentNote: note,
        },
      });

      if (action !== 'reject' && finalAmount > 0) {
        await this.ledger.append({
          orderId: resolveCase.orderId,
          cause: 'platform',
          actor: agentId,
          kind: finalDestination === 'source' ? 'refund' : 'credit',
          amountPaise: finalAmount,
          destination: finalDestination,
          note: `Agent ${action}: ${reasonCode}${note ? ` — ${note}` : ''}`,
          evidenceRefs: [caseId],
        });
      } else if (action === 'reject') {
        await this.ledger.append({
          orderId: resolveCase.orderId,
          cause: 'platform',
          actor: agentId,
          kind: 'note',
          amountPaise: 0,
          note: `Agent rejected: ${reasonCode}${note ? ` — ${note}` : ''}`,
        });
      }
    });

    // Notify customer
    this.realtime.emitToUser(resolveCase.userId, {
      t: 'case.updated',
      caseId,
      status: action === 'reject' ? 'rejected' : 'resolved',
      agentNote: note,
    });

    return { ok: true };
  }

  async getAllCases() {
    return this.prisma.resolveCase.findMany({
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        order: { include: { items: true, restaurant: { select: { id: true, name: true, issueRate: true } } } },
        evidence: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getRecoveryLedger() {
    return this.prisma.ledgerEntry.findMany({
      include: {
        order: {
          select: {
            id: true,
            totalPaise: true,
            status: true,
            restaurant: { select: { name: true } },
            user: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { at: 'desc' },
      take: 100,
    });
  }
}
