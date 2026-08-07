import { Module } from '@nestjs/common';
import { CurricularSpacesController } from './curricular-spaces.controller.js';
import { CurricularSpacesService } from './curricular-spaces.service.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [SessionModule],
  controllers: [CurricularSpacesController],
  providers: [CurricularSpacesService],
})
export class CurricularSpacesModule {}
