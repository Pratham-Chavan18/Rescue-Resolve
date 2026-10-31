import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '@swiggy/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async verify(phone: string, otp: string): Promise<{ accessToken: string; user: { id: string; role: string; name: string } }> {
    // Demo: fixed OTP per DECISIONS D10 — never log otp value (CONSTRAINTS §4.13)
    const expectedOtp = process.env['DEMO_OTP'] ?? '1234';
    if (otp !== expectedOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('Phone number not registered in demo');
    }

    // Get role-specific IDs for JWT payload
    let restaurantId: string | undefined;
    let riderId: string | undefined;

    if (user.role === 'restaurant') {
      const restaurant = await this.prisma.restaurant.findUnique({ where: { userId: user.id } });
      restaurantId = restaurant?.id;
    }
    if (user.role === 'rider') {
      const rider = await this.prisma.rider.findUnique({ where: { userId: user.id } });
      riderId = rider?.id;
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as JwtPayload['role'],
      phone: user.phone,
      restaurantId,
      riderId,
    };

    const accessToken = this.jwt.sign(payload);

    return {
      accessToken,
      user: { id: user.id, role: user.role, name: user.name },
    };
  }
}
