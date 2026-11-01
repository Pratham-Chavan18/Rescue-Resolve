import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RescueService } from './rescue.service';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { LedgerService } from '../ledger/ledger.service';
import type { RealtimeService } from '../realtime/realtime.service';

describe('RescueService (Choice Idempotency & Workflow)', () => {
  let service: RescueService;
  let mockPrisma: any;
  let mockLedger: any;
  let mockRealtime: any;

  beforeEach(() => {
    mockPrisma = {
      rescueCase: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      restaurant: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };
    mockLedger = {
      append: vi.fn(),
    };
    mockRealtime = {
      emitToOrder: vi.fn(),
      emitToRestaurant: vi.fn(),
    };

    service = new RescueService(
      mockPrisma as unknown as PrismaService,
      mockLedger as unknown as LedgerService,
      mockRealtime as unknown as RealtimeService
    );
  });

  const mockOpenCase = {
    id: 'case_1',
    orderId: 'order_1',
    status: 'offered',
    trigger: 'rider_stationary',
    optionsJson: [
      {
        kind: 'wait',
        label: 'Get ₹50 credit now',
        creditAmount: 5000,
        newEta: new Date().toISOString(),
      },
      {
        kind: 'cancel',
        label: 'Cancel and get ₹250 refund',
        refundAmount: 25000,
      },
    ],
  };

  const mockOrder = {
    id: 'order_1',
    userId: 'user_1',
    restaurantId: 'rest_1',
    totalPaise: 25000,
    items: [{ id: 'item_1', name: 'Biryani', isVeg: false }],
  };

  it('records a valid wait choice and appends wallet credit to ledger', async () => {
    mockPrisma.rescueCase.findUnique.mockResolvedValue(mockOpenCase);
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

    await service.recordChoice('case_1', 'user_1', 'wait');

    expect(mockPrisma.rescueCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'case_1' },
        data: expect.objectContaining({
          choice: 'wait',
          status: 'accepted',
        }),
      })
    );

    expect(mockLedger.append).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order_1',
        kind: 'credit',
        amountPaise: 5000,
        destination: 'wallet',
      })
    );
  });

  it('records a cancel choice, marks order cancelled, and appends refund to source', async () => {
    mockPrisma.rescueCase.findUnique.mockResolvedValue(mockOpenCase);
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

    await service.recordChoice('case_1', 'user_1', 'cancel');

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order_1' },
      data: { status: 'cancelled' },
    });

    expect(mockLedger.append).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order_1',
        kind: 'refund',
        amountPaise: 25000,
        destination: 'source',
      })
    );
  });

  it('throws ConflictException if case is already accepted (idempotency guard)', async () => {
    mockPrisma.rescueCase.findUnique.mockResolvedValue({
      ...mockOpenCase,
      status: 'accepted',
    });

    await expect(service.recordChoice('case_1', 'user_1', 'wait')).rejects.toThrow(
      ConflictException
    );
    expect(mockLedger.append).not.toHaveBeenCalled();
  });

  it('throws NotFoundException if case does not exist', async () => {
    mockPrisma.rescueCase.findUnique.mockResolvedValue(null);

    await expect(service.recordChoice('nonexistent', 'user_1', 'wait')).rejects.toThrow(
      NotFoundException
    );
  });

  it('throws BadRequestException if choice is not in the options snapshot', async () => {
    mockPrisma.rescueCase.findUnique.mockResolvedValue(mockOpenCase);
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

    await expect(
      service.recordChoice('case_1', 'user_1', 'replace' as any)
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ForbiddenException if user does not own the order (IDOR guard)', async () => {
    mockPrisma.rescueCase.findUnique.mockResolvedValue(mockOpenCase);
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

    await expect(
      service.recordChoice('case_1', 'attacker_user_2', 'wait')
    ).rejects.toThrow(ForbiddenException);
    expect(mockLedger.append).not.toHaveBeenCalled();
  });
});
