import { Controller, Get, Param, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Render liveness probe.
   * Public, lightweight endpoint to verify API process is responsive.
   */
  @Get()
  getLiveness() {
    return {
      status: 'ok',
      service: 'swiggy-unified-recovery-api',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe.
   * Public endpoint that checks database connectivity before routing user traffic.
   */
  @Get('ready')
  async getReadiness() {
    const dbStatus = await this.healthService.checkDatabase();
    if (!dbStatus.connected) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        schema: 'unreachable',
        timestamp: new Date().toISOString(),
      });
    }

    if (!dbStatus.schemaReady) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'connected',
        schema: 'pending_migration',
        message: 'Database schema is not yet migrated. Run prisma migrate deploy.',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      database: 'connected',
      schema: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Order health inspection — protected by JWT room/user authorization.
   */
  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  async getHealth(@Param('orderId') orderId: string) {
    return this.healthService.getHealthForOrder(orderId);
  }
}
