import { Controller, Get, UseGuards } from '@nestjs/common';
import type { SchoolSummary } from '@pci/domain';
import { SchoolsService } from './schools.service.js';
import { DevSessionGuard } from '../session/dev-session.guard.js';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import type { RequestSession } from '../../common/types/authenticated-request.js';

@Controller('schools')
@UseGuards(DevSessionGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  async list(@CurrentSession() session: RequestSession): Promise<SchoolSummary[]> {
    return this.schoolsService.listAccessibleSchools(session.userId);
  }
}
