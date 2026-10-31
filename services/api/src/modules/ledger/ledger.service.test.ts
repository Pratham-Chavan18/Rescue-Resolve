import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LedgerService, AppendLedgerDto } from './ledger.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('LedgerService (Append-Only Invariant)', () => {
  let service: LedgerService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      ledgerEntry: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    };
    service = new LedgerService(mockPrisma as unknown as PrismaService);
  });

  it('successfully appends a new ledger entry with valid integer paise', async () => {
    const dto: AppendLedgerDto = {
      orderId: 'order_123',
      cause: 'logistics',
      actor: 'system',
      kind: 'credit',
      amountPaise: 5000, // ₹50
      destination: 'wallet',
      note: 'Wait credit for delay',
      evidenceRefs: ['evidence_1'],
    };

    const mockCreatedEntry = { id: 'led_1', ...dto, at: new Date() };
    mockPrisma.ledgerEntry.create.mockResolvedValue(mockCreatedEntry);

    const result = await service.append(dto);

    expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order_123',
        cause: 'logistics',
        actor: 'system',
        kind: 'credit',
        amountPaise: 5000,
        destination: 'wallet',
        note: 'Wait credit for delay',
        evidenceJson: ['evidence_1'],
      },
    });
    expect(result).toEqual(mockCreatedEntry);
  });

  it('throws an error if amountPaise is a float (CONSTRAINTS §3.10)', async () => {
    const dto: AppendLedgerDto = {
      orderId: 'order_123',
      cause: 'logistics',
      actor: 'system',
      kind: 'credit',
      amountPaise: 50.75, // float!
      destination: 'wallet',
      note: 'Invalid float',
    };

    await expect(service.append(dto)).rejects.toThrow(
      'LedgerEntry.amountPaise must be an integer; received 50.75'
    );
    expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
  });

  it('retrieves entries for an order in ascending chronological order', async () => {
    const mockEntries = [
      { id: '1', orderId: 'ord_1', at: new Date('2026-11-01T00:00:00Z') },
      { id: '2', orderId: 'ord_1', at: new Date('2026-11-01T00:05:00Z') },
    ];
    mockPrisma.ledgerEntry.findMany.mockResolvedValue(mockEntries);

    const entries = await service.getEntriesForOrder('ord_1');

    expect(mockPrisma.ledgerEntry.findMany).toHaveBeenCalledWith({
      where: { orderId: 'ord_1' },
      orderBy: { at: 'asc' },
    });
    expect(entries).toEqual(mockEntries);
  });

  it('has no update or delete methods, preserving the append-only invariant', () => {
    expect((service as any).update).toBeUndefined();
    expect((service as any).delete).toBeUndefined();
    expect((service as any).remove).toBeUndefined();
  });
});
