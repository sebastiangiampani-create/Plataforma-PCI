import { Module } from '@nestjs/common';
import { ValidationController } from './validation.controller.js';
import { ValidationService } from './validation.service.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [SessionModule],
  controllers: [ValidationController],
  providers: [ValidationService],
})
export class ValidationModule {}
