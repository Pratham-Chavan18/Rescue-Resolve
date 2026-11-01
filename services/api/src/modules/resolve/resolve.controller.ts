import {
  Controller, Get, Post, Param, Body, UseGuards, Request,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResolveService } from './resolve.service';
import { JwtAuthGuard } from '../auth/guards';
import { IsIn, IsOptional, IsArray, IsString } from 'class-validator';
import type { JwtPayload, IssueKind } from '@swiggy/types';

export class CreateCaseDto {
  @IsString()
  orderId!: string;

  @IsIn(['wrong_item', 'missing_item', 'quality', 'late_delivery'])
  issue!: IssueKind;
}

export class AddLineItemsDto {
  @IsArray()
  @IsString({ each: true })
  itemIds!: string[];
}

@Controller('resolve')
@UseGuards(JwtAuthGuard)
export class ResolveController {
  constructor(private readonly resolveService: ResolveService) {}

  @Get('cases')
  async getMyCases(@Request() req: { user: JwtPayload }) {
    return this.resolveService.getCasesForCustomer(req.user.sub);
  }

  @Get('cases/:id')
  async getCase(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.resolveService.getCaseById(id, req.user.sub);
  }

  @Post('cases')
  async createCase(@Body() dto: CreateCaseDto, @Request() req: { user: JwtPayload }) {
    return this.resolveService.createCase(req.user.sub, dto.orderId, dto.issue);
  }

  @Post('cases/:id/evidence')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit per CONSTRAINTS §4.16
    }),
  )
  async addEvidence(
    @Param('id') id: string,
    @Body() body: { itemIds?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Request() req: { user: JwtPayload },
  ) {
    const itemIds = body.itemIds ? JSON.parse(body.itemIds) as string[] : undefined;
    return this.resolveService.addEvidence(id, req.user.sub, file, itemIds);
  }

  @Get('cases/:id/preview')
  async previewDecision(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.resolveService.previewDecision(id, req.user.sub);
  }

  @Post('cases/:id/submit')
  async submitCase(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.resolveService.submitCase(id, req.user.sub);
  }

  @Post('cases/:id/accept')
  async acceptCase(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.resolveService.acceptCase(id, req.user.sub);
  }

  @Post('cases/:id/escalate')
  async escalateCase(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.resolveService.escalateCase(id, req.user.sub);
  }
}
