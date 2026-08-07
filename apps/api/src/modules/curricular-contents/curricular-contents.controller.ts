import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  listCurricularContentsQuerySchema,
  type CurricularContentListResponse,
  type CurricularTaxonomyArea,
  type ListCurricularContentsQuery,
} from '@pci/domain';
import { CurricularContentsService } from './curricular-contents.service.js';
import { DevSessionGuard } from '../session/dev-session.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@Controller()
@UseGuards(DevSessionGuard)
export class CurricularContentsController {
  constructor(private readonly service: CurricularContentsService) {}

  @Get('curricular-contents')
  async list(
    @Query(new ZodValidationPipe(listCurricularContentsQuerySchema))
    query: ListCurricularContentsQuery,
  ): Promise<CurricularContentListResponse> {
    return this.service.list(query);
  }

  @Get('curricular-taxonomy')
  async taxonomy(
    @Query('componentCode') componentCode = 'FORMACION_GENERAL',
  ): Promise<CurricularTaxonomyArea[]> {
    return this.service.taxonomy(componentCode);
  }
}
