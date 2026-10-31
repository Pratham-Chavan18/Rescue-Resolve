import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AgentService } from './agent.service';
import { JwtRoleGuard, Roles } from '../auth/guards';
import { IsIn, IsNumber, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Reflector } from '@nestjs/core';
import type { JwtPayload, AgentAction } from '@swiggy/types';

export class AgentActionDto {
  @IsIn(['approve', 'custom_refund', 'reject'])
  action!: AgentAction;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountPaise?: number;

  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('agent')
@UseGuards(JwtRoleGuard)
@Roles('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly reflector: Reflector,
  ) {}

  @Get('cases')
  async getCaseQueue() {
    return this.agentService.getCaseQueue();
  }

  @Get('cases/:id')
  async getCasePack(@Param('id') id: string) {
    return this.agentService.getCasePack(id);
  }

  @Post('cases/:id/action')
  async takeAction(
    @Param('id') id: string,
    @Body() dto: AgentActionDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.agentService.takeAction(id, req.user.sub, dto.action, dto.reasonCode, dto.amountPaise, dto.note);
  }
}
