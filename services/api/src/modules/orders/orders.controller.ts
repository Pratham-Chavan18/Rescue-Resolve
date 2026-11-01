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

  @Get('all')
  async getAllOrders(@Request() req: { user: JwtPayload }) {
    return this.ordersService.getAllOrdersForCustomer(req.user.sub);
  }

  @Get('completed')
  async getCompletedOrders(@Request() req: { user: JwtPayload }) {
    return this.ordersService.getCompletedOrdersForCustomer(req.user.sub);
  }

  @Get('recovery/history')
  async getCustomerRecoveryHistory(@Request() req: { user: JwtPayload }) {
    return this.ordersService.getCustomerRecoveryHistory(req.user.sub);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.ordersService.getOrderById(id, req.user);
  }
}
