import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller.js';
import { SchoolsService } from './schools.service.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [SessionModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
})
export class SchoolsModule {}
