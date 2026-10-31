import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { RescueService } from './rescue.service';
import { JwtAuthGuard, Roles, JwtRoleGuard } from '../auth/guards';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { JwtPayload, RescueChoice } from '@swiggy/types';
import { Reflector } from '@nestjs/core';

export class RescueChoiceDto {
  @IsIn(['wait', 'replace', 'cancel'])
  choice!: RescueChoice;

  @IsOptional()
  @IsString()
  replacementRestaurantId?: string;
}

@Controller('rescue')
@UseGuards(JwtAuthGuard)
export class RescueController {
  constructor(private readonly rescueService: RescueService) {}

  @Get(':orderId')
  async getCase(@Param('orderId') orderId: string) {
    return this.rescueService.getCase(orderId);
  }

  @Post(':caseId/choice')
  async recordChoice(
    @Param('caseId') caseId: string,
    @Body() dto: RescueChoiceDto,
    @Request() req: { user: JwtPayload },
  ) {
    await this.rescueService.recordChoice(caseId, req.user.sub, dto.choice, dto.replacementRestaurantId);
    return { ok: true };
  }
}
