import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  setWeeklyHoursRequestSchema,
  type SetWeeklyHoursRequest,
  type WeeklyHoursEntry,
  type WeeklyHoursSuggestion,
} from '@pci/domain';
import { WeeklyHoursService } from './weekly-hours.service.js';
import { DevSessionGuard } from '../session/dev-session.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import type { RequestSession } from '../../common/types/authenticated-request.js';

@Controller('curricular-spaces/:id/weekly-hours')
@UseGuards(DevSessionGuard)
export class WeeklyHoursController {
  constructor(private readonly service: WeeklyHoursService) {}

  @Get()
  async list(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
  ): Promise<WeeklyHoursEntry[]> {
    return this.service.list(this.requireActiveSchool(session), id);
  }

  @Get('suggestions')
  async suggestions(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
  ): Promise<WeeklyHoursSuggestion[]> {
    return this.service.suggestions(this.requireActiveSchool(session), id);
  }

  @Put()
  async set(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setWeeklyHoursRequestSchema)) body: SetWeeklyHoursRequest,
  ): Promise<WeeklyHoursEntry[]> {
    return this.service.set(this.requireActiveSchool(session), id, body);
  }

  @Delete(':areaCode/:termNumber')
  async remove(
    @CurrentSession() session: RequestSession,
    @Param('id') id: string,
    @Param('areaCode') areaCode: string,
    @Param('termNumber', ParseIntPipe) termNumber: number,
  ): Promise<WeeklyHoursEntry[]> {
    return this.service.remove(this.requireActiveSchool(session), id, areaCode, termNumber);
  }

  private requireActiveSchool(session: RequestSession): string {
    if (!session.activeSchoolId) {
      throw new ForbiddenException({
        code: 'NO_ACTIVE_SCHOOL',
        message: 'Seleccioná una escuela activa antes de gestionar la carga horaria.',
      });
    }
    return session.activeSchoolId;
  }
}
