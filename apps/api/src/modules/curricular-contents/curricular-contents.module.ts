import { Module } from '@nestjs/common';
import { CurricularContentsController } from './curricular-contents.controller.js';
import { CurricularContentsService } from './curricular-contents.service.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [SessionModule],
  controllers: [CurricularContentsController],
  providers: [CurricularContentsService],
})
export class CurricularContentsModule {}
