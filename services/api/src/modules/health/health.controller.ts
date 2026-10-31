import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('health')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(':orderId')
  async getHealth(@Param('orderId') orderId: string) {
    return this.healthService.getHealthForOrder(orderId);
  }
}
