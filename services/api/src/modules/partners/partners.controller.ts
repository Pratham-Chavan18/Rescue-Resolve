import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { JwtRoleGuard, Roles } from '../auth/guards';
import { IsIn, IsNumber, IsString, Min, Max } from 'class-validator';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from '@swiggy/types';

export class ConfirmPackingDto {
  @IsNumber()
  @Min(1)
  @Max(60)
  confirmedMinutes!: number;
}

export class DeclineItemDto {
  @IsString()
  itemId!: string;
}

@Controller('partner')
@UseGuards(JwtRoleGuard)
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly reflector: Reflector,
  ) {}

  @Get('restaurant/orders')
  @Roles('restaurant')
  async getRestaurantOrders(@Request() req: { user: JwtPayload }) {
    if (!req.user.restaurantId) return [];
    return this.partnersService.getRestaurantOrders(req.user.restaurantId);
  }

  @Post('restaurant/orders/:id/confirm-packing')
  @Roles('restaurant')
  async confirmPacking(
    @Param('id') orderId: string,
    @Body() dto: ConfirmPackingDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.partnersService.confirmPackingTime(orderId, req.user.restaurantId!, dto.confirmedMinutes);
  }

  @Post('restaurant/orders/:id/decline-item')
  @Roles('restaurant')
  async declineItem(
    @Param('id') orderId: string,
    @Body() dto: DeclineItemDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.partnersService.declineItem(orderId, req.user.restaurantId!, dto.itemId);
  }

  @Get('rider/tasks')
  @Roles('rider')
  async getRiderTasks(@Request() req: { user: JwtPayload }) {
    if (!req.user.riderId) return [];
    return this.partnersService.getRiderTasks(req.user.riderId);
  }

  @Post('rider/tasks/:orderId/accept-reassignment')
  @Roles('rider')
  async acceptReassignment(
    @Param('orderId') orderId: string,
    @Request() req: { user: JwtPayload },
  ) {
    return this.partnersService.acceptReassignment(orderId, req.user.riderId!);
  }
}
