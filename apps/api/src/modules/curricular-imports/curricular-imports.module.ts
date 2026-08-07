import { Module } from '@nestjs/common';
import { CurricularImportsController } from './curricular-imports.controller.js';
import { CurricularImportsService } from './curricular-imports.service.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [SessionModule],
  controllers: [CurricularImportsController],
  providers: [CurricularImportsService],
})
export class CurricularImportsModule {}
