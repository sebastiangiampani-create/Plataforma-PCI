import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { DevAuthEnabledGuard } from './dev-auth-enabled.guard.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [SessionModule],
  controllers: [AuthController],
  providers: [AuthService, DevAuthEnabledGuard],
})
export class AuthModule {}
