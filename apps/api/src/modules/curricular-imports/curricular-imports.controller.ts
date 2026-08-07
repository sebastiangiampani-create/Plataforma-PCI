import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  createCurricularImportRequestSchema,
  type CreateCurricularImportRequest,
  type CurricularImportListItem,
  type CurricularImportSummary,
} from '@pci/domain';
import { CurricularImportsService } from './curricular-imports.service.js';
import { DevSessionGuard } from '../session/dev-session.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import type { RequestSession } from '../../common/types/authenticated-request.js';

@Controller('curricular-imports')
@UseGuards(DevSessionGuard)
export class CurricularImportsController {
  constructor(private readonly service: CurricularImportsService) {}

  @Post()
  async create(
    @CurrentSession() session: RequestSession,
    @Body(new ZodValidationPipe(createCurricularImportRequestSchema))
    body: CreateCurricularImportRequest,
  ): Promise<CurricularImportSummary> {
    return this.service.createImport(body, session.userId);
  }

  @Get()
  async list(@Query('schoolId') schoolId?: string): Promise<CurricularImportListItem[]> {
    return this.service.listImports(schoolId);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<CurricularImportSummary> {
    return this.service.getImport(id);
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string): Promise<CurricularImportSummary> {
    return this.service.confirmImport(id);
  }

  @Post(':id/revert')
  async revert(@Param('id') id: string): Promise<CurricularImportSummary> {
    return this.service.revertImport(id);
  }
}
