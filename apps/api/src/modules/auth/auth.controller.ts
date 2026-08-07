import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { devLoginRequestSchema, type SessionResponse } from '@pci/domain';
import { AuthService } from './auth.service.js';
import { DevAuthEnabledGuard } from './dev-auth-enabled.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { toSessionResponse } from '../session/session.mapper.js';

@Controller('auth')
@UseGuards(DevAuthEnabledGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('dev-login')
  async devLogin(
    @Body(new ZodValidationPipe(devLoginRequestSchema))
    body: {
      email: string;
      displayName?: string;
    },
  ): Promise<SessionResponse> {
    const session = await this.authService.devLogin(body.email, body.displayName);
    return toSessionResponse(session);
  }
}
