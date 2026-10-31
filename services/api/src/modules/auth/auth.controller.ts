import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, Length, Matches } from 'class-validator';

export class OtpRequestDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid phone number' })
  phone!: string;
}

export class OtpVerifyDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid phone number' })
  phone!: string;

  @IsString()
  @Length(4, 4)
  otp!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: OtpRequestDto) {
    // In demo: always succeeds. Never log the OTP (CONSTRAINTS §4.13).
    return { message: 'OTP sent' };
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verify(dto.phone, dto.otp);
  }
}
