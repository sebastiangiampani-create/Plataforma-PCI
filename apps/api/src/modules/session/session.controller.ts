import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { selectSchoolRequestSchema, type SessionResponse } from '@pci/domain';
import { SessionService } from './session.service.js';
import { DevSessionGuard } from './dev-session.guard.js';
import { toSessionResponse } from './session.mapper.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import type { RequestSession } from '../../common/types/authenticated-request.js';

@Controller('session')
@UseGuards(DevSessionGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  getSession(@CurrentSession() session: RequestSession): SessionResponse {
    return toSessionResponse(session);
  }

  @Post('school')
  async selectSchool(
    @CurrentSession() session: RequestSession,
    @Body(new ZodValidationPipe(selectSchoolRequestSchema)) body: { schoolId: string },
  ): Promise<SessionResponse> {
    const updated = await this.sessionService.setActiveSchool(session, body.schoolId);
    return toSessionResponse(updated);
  }
}
