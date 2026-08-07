import { Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { ValidationRunResponse } from '@pci/domain';
import { ValidationService } from './validation.service.js';
import { DevSessionGuard } from '../session/dev-session.guard.js';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import type { RequestSession } from '../../common/types/authenticated-request.js';

@Controller()
@UseGuards(DevSessionGuard)
export class ValidationController {
  constructor(private readonly service: ValidationService) {}

  @Post('pci-versions/:id/validate')
  async run(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
  ): Promise<ValidationRunResponse> {
    return this.service.run(this.requireActiveSchool(session), id);
  }

  @Get('pci-versions/:id/validation-results')
  async results(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
  ): Promise<ValidationRunResponse> {
    return this.service.currentResults(this.requireActiveSchool(session), id);
  }

  private requireActiveSchool(session: RequestSession): string {
    if (!session.activeSchoolId) {
      throw new ForbiddenException({
        code: 'NO_ACTIVE_SCHOOL',
        message: 'Seleccioná una escuela activa antes de validar un PCI.',
      });
    }
    return session.activeSchoolId;
  }
}
