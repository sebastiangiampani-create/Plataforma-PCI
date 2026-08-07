import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  assignContentRequestSchema,
  createCurricularSpaceRequestSchema,
  type AssignContentRequest,
  type ContentAssignmentSummary,
  type CreateCurricularSpaceRequest,
  type CurricularSpaceSummary,
} from '@pci/domain';
import { CurricularSpacesService } from './curricular-spaces.service.js';
import { DevSessionGuard } from '../session/dev-session.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import type { RequestSession } from '../../common/types/authenticated-request.js';

@Controller()
@UseGuards(DevSessionGuard)
export class CurricularSpacesController {
  constructor(private readonly service: CurricularSpacesService) {}

  @Get('pci-versions/:versionId/curricular-spaces')
  async list(
    @CurrentSession() session: RequestSession,
    @Param('versionId') versionId: string,
  ): Promise<CurricularSpaceSummary[]> {
    return this.service.listForVersion(this.requireActiveSchool(session), versionId);
  }

  @Post('pci-versions/:versionId/curricular-spaces')
  async create(
    @CurrentSession() session: RequestSession,
    @Param('versionId') versionId: string,
    @Body(new ZodValidationPipe(createCurricularSpaceRequestSchema))
    body: CreateCurricularSpaceRequest,
  ): Promise<CurricularSpaceSummary> {
    return this.service.createSpace(this.requireActiveSchool(session), versionId, body);
  }

  @Get('curricular-spaces/:id')
  async get(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
  ): Promise<CurricularSpaceSummary> {
    return this.service.getSpace(this.requireActiveSchool(session), id);
  }

  @Get('curricular-spaces/:id/content-assignments')
  async listAssignments(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
  ): Promise<ContentAssignmentSummary[]> {
    return this.service.listAssignments(this.requireActiveSchool(session), id);
  }

  @Post('curricular-spaces/:id/content-assignments')
  async assign(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignContentRequestSchema)) body: AssignContentRequest,
  ): Promise<ContentAssignmentSummary[]> {
    return this.service.assignContent(this.requireActiveSchool(session), id, body);
  }

  @Delete('curricular-spaces/:id/content-assignments/:contentId')
  async unassign(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
    @Param('contentId') contentId: string,
  ): Promise<ContentAssignmentSummary[]> {
    return this.service.unassignContent(this.requireActiveSchool(session), id, contentId);
  }

  private requireActiveSchool(session: RequestSession): string {
    if (!session.activeSchoolId) {
      throw new ForbiddenException({
        code: 'NO_ACTIVE_SCHOOL',
        message: 'Seleccioná una escuela activa antes de gestionar espacios curriculares.',
      });
    }
    return session.activeSchoolId;
  }
}
