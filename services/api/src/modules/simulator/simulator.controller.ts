import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { JwtAuthGuard } from '../auth/guards';
import { IsIn } from 'class-validator';
import type { SimFault } from '@swiggy/types';

export class FaultDto {
  @IsIn(['rider_stuck', 'restaurant_slow', 'eta_slip', 'delivered_unconfirmed', 'wrong_item'])
  kind!: SimFault;
}

@Controller('sim')
@UseGuards(JwtAuthGuard)
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post(':orderId/fault')
  async injectFault(@Param('orderId') orderId: string, @Body() dto: FaultDto) {
    await this.simulatorService.injectFault(orderId, dto.kind);
    return { ok: true };
  }

  @Post('reset')
  async reset() {
    await this.simulatorService.reset();
    return { ok: true };
  }
}
