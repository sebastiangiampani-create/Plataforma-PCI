import { Module } from '@nestjs/common';
import { SessionService } from './session.service.js';
import { SessionController } from './session.controller.js';
import { DevSessionGuard } from './dev-session.guard.js';

@Module({
  controllers: [SessionController],
  providers: [SessionService, DevSessionGuard],
  exports: [SessionService, DevSessionGuard],
})
export class SessionModule {}
