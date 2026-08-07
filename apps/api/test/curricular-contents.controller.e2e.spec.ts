import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import type { CurricularContentListResponse } from '@pci/domain';
import { CurricularContentsController } from '../src/modules/curricular-contents/curricular-contents.controller.js';
import { CurricularContentsService } from '../src/modules/curricular-contents/curricular-contents.service.js';
import { DevSessionGuard } from '../src/modules/session/dev-session.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import type {
  AuthenticatedRequest,
  RequestSession,
} from '../src/common/types/authenticated-request.js';

describe('CurricularContentsController (e2e)', () => {
  let app: INestApplication;
  const fakeSession: RequestSession = {
    sessionId: 'session-1',
    token: 'token-1',
    userId: 'user-1',
    userEmail: 'persona@example.com',
    userDisplayName: 'Persona',
    activeSchoolId: null,
    expiresAt: new Date().toISOString(),
  };
  const emptyResponse: CurricularContentListResponse = {
    items: [],
    total: 0,
    limit: 50,
    offset: 0,
  };

  let list: jest.Mock<CurricularContentsService['list']>;

  beforeAll(async () => {
    list = jest.fn<CurricularContentsService['list']>().mockResolvedValue(emptyResponse);

    const moduleRef = await Test.createTestingModule({
      controllers: [CurricularContentsController],
      providers: [{ provide: CurricularContentsService, useValue: { list, taxonomy: jest.fn() } }],
    })
      .overrideGuard(DevSessionGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
          req.session = fakeSession;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /curricular-contents aplica los valores por defecto de componentCode/limit/offset', async () => {
    await request(app.getHttpServer()).get('/curricular-contents').expect(200);
    expect(list).toHaveBeenCalledWith({
      componentCode: 'FORMACION_GENERAL',
      limit: 50,
      offset: 0,
    });
  });

  it('GET /curricular-contents responde 400 si limit es inválido', async () => {
    const response = await request(app.getHttpServer())
      .get('/curricular-contents?limit=0')
      .expect(400);
    expect(response.body.error).toBeDefined();
  });

  it('GET /curricular-contents pasa los filtros recibidos', async () => {
    await request(app.getHttpServer())
      .get('/curricular-contents?areaCode=MATEMATICA&search=Internet&limit=10&offset=20')
      .expect(200);
    expect(list).toHaveBeenCalledWith({
      componentCode: 'FORMACION_GENERAL',
      areaCode: 'MATEMATICA',
      search: 'Internet',
      limit: 10,
      offset: 20,
    });
  });
});
