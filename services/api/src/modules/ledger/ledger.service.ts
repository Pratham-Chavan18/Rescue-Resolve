import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { LedgerCause, LedgerKind, EntitlementDestination } from '@swiggy/types';

export interface AppendLedgerDto {
  orderId: string;
  cause: LedgerCause;
  actor: string;
  kind: LedgerKind;
  /** Amount in integer paise — 0 for notes */
  amountPaise: number;
  destination?: EntitlementDestination;
  note: string;
  evidenceRefs?: string[];
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a new ledger entry — NEVER update or delete existing entries.
   * CONSTRAINTS §3.9, DECISIONS D12: ledger is append-only.
   */
  async append(dto: AppendLedgerDto) {
    // Validate integer paise — no floats (CONSTRAINTS §3.10)
    if (!Number.isInteger(dto.amountPaise)) {
      throw new Error(`LedgerEntry.amountPaise must be an integer; received ${dto.amountPaise}`);
    }

    return this.prisma.ledgerEntry.create({
      data: {
        orderId: dto.orderId,
        cause: dto.cause,
        actor: dto.actor,
        kind: dto.kind,
        amountPaise: dto.amountPaise,
        destination: dto.destination,
        note: dto.note,
        evidenceJson: dto.evidenceRefs ?? [],
      },
    });
  }

  async getEntriesForOrder(orderId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { orderId },
      orderBy: { at: 'asc' },
    });
  }
}
