import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards';
import type { JwtPayload } from '@swiggy/types';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('me')
  async getMyOrder(@Request() req: { user: JwtPayload }) {
    return this.ordersService.getActiveOrderForCustomer(req.user.sub);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.ordersService.getOrderById(id, req.user);
  }
}
