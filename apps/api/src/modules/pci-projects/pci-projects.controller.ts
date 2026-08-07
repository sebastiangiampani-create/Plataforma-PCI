import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createPciProjectRequestSchema,
  updatePciVersionRequestSchema,
  type CreatePciProjectRequest,
  type PciProjectSummary,
  type PciVersionSummary,
  type UpdatePciVersionRequest,
} from '@pci/domain';
import { PciProjectsService } from './pci-projects.service.js';
import { DevSessionGuard } from '../session/dev-session.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import type { RequestSession } from '../../common/types/authenticated-request.js';

@Controller()
@UseGuards(DevSessionGuard)
export class PciProjectsController {
  constructor(private readonly service: PciProjectsService) {}

  @Get('pci-projects')
  async list(@CurrentSession() session: RequestSession): Promise<PciProjectSummary[]> {
    return this.service.listForSchool(this.requireActiveSchool(session));
  }

  @Get('pci-projects/:id')
  async get(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
  ): Promise<PciProjectSummary> {
    return this.service.getProject(this.requireActiveSchool(session), id);
  }

  @Post('pci-projects')
  async create(
    @CurrentSession() session: RequestSession,
    @Body(new ZodValidationPipe(createPciProjectRequestSchema)) body: CreatePciProjectRequest,
  ): Promise<PciProjectSummary> {
    return this.service.createProject(this.requireActiveSchool(session), body.name, session.userId);
  }

  @Post('pci-projects/:id/versions')
  async createVersion(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
  ): Promise<PciProjectSummary> {
    return this.service.createVersion(this.requireActiveSchool(session), id, session.userId);
  }

  @Patch('pci-versions/:id')
  async updateVersion(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePciVersionRequestSchema)) body: UpdatePciVersionRequest,
  ): Promise<PciVersionSummary> {
    return this.service.updateVersion(
      this.requireActiveSchool(session),
      id,
      body.pedagogicalRationale,
    );
  }

  @Post('pci-versions/:id/publish')
  async publish(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
  ): Promise<PciVersionSummary> {
    return this.service.publishVersion(this.requireActiveSchool(session), id, session.userId);
  }

  private requireActiveSchool(session: RequestSession): string {
    if (!session.activeSchoolId) {
      throw new ForbiddenException({
        code: 'NO_ACTIVE_SCHOOL',
        message: 'Seleccioná una escuela activa antes de gestionar proyectos PCI.',
      });
    }
    return session.activeSchoolId;
  }
}
