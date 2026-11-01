import { describe, it, expect, vi } from 'vitest';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  it('returns ok for liveness probe', () => {
    const healthService = {} as HealthService;
    const controller = new HealthController(healthService);

    const liveness = controller.getLiveness();
    expect(liveness.status).toBe('ok');
    expect(liveness.service).toBe('swiggy-unified-recovery-api');
    expect(typeof liveness.uptime).toBe('number');
  });

  it('throws 503 ServiceUnavailableException if database is disconnected', async () => {
    const healthService = {
      checkDatabase: vi.fn().mockResolvedValue({ connected: false, schemaReady: false }),
    } as unknown as HealthService;

    const controller = new HealthController(healthService);

    await expect(controller.getReadiness()).rejects.toThrow(ServiceUnavailableException);
    try {
      await controller.getReadiness();
    } catch (err: any) {
      expect(err.getResponse()).toMatchObject({
        status: 'error',
        database: 'disconnected',
        schema: 'unreachable',
      });
    }
  });

  it('throws 503 ServiceUnavailableException if database is connected but schema is pending migration', async () => {
    const healthService = {
      checkDatabase: vi.fn().mockResolvedValue({ connected: true, schemaReady: false }),
    } as unknown as HealthService;

    const controller = new HealthController(healthService);

    await expect(controller.getReadiness()).rejects.toThrow(ServiceUnavailableException);
    try {
      await controller.getReadiness();
    } catch (err: any) {
      expect(err.getResponse()).toMatchObject({
        status: 'error',
        database: 'connected',
        schema: 'pending_migration',
      });
    }
  });

  it('returns 200 ok when database is connected and schema is ready', async () => {
    const healthService = {
      checkDatabase: vi.fn().mockResolvedValue({ connected: true, schemaReady: true }),
    } as unknown as HealthService;

    const controller = new HealthController(healthService);
    const result = await controller.getReadiness();

    expect(result).toMatchObject({
      status: 'ok',
      database: 'connected',
      schema: 'ready',
    });
  });
});
