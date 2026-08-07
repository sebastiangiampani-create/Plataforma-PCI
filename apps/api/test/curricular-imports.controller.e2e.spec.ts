import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import type { CurricularImportSummary } from '@pci/domain';
import { CurricularImportsController } from '../src/modules/curricular-imports/curricular-imports.controller.js';
import { CurricularImportsService } from '../src/modules/curricular-imports/curricular-imports.service.js';
import { DevSessionGuard } from '../src/modules/session/dev-session.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import type {
  AuthenticatedRequest,
  RequestSession,
} from '../src/common/types/authenticated-request.js';

describe('CurricularImportsController (e2e)', () => {
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
  const fakeSummary: CurricularImportSummary = {
    id: '11111111-1111-4111-8111-111111111111',
    schoolId: null,
    sourceName: 'prueba',
    sourceVersion: 'v1',
    status: 'PREVIEW',
    importedBy: fakeSession.userId,
    createdAt: new Date().toISOString(),
    revertedAt: null,
    rows: [],
  };

  let createImport: jest.Mock<CurricularImportsService['createImport']>;

  beforeAll(async () => {
    createImport = jest
      .fn<CurricularImportsService['createImport']>()
      .mockResolvedValue(fakeSummary);

    const moduleRef = await Test.createTestingModule({
      controllers: [CurricularImportsController],
      providers: [{ provide: CurricularImportsService, useValue: { createImport } }],
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

  it('POST /curricular-imports acepta un body válido y pasa el userId de la sesión', async () => {
    const response = await request(app.getHttpServer())
      .post('/curricular-imports')
      .send({ sourceName: 'prueba', sourceVersion: 'v1', csvContent: 'a,b\n1,2' })
      .expect(201);

    expect(response.body).toMatchObject({ id: fakeSummary.id });
    expect(createImport).toHaveBeenCalledWith(
      { sourceName: 'prueba', sourceVersion: 'v1', csvContent: 'a,b\n1,2' },
      fakeSession.userId,
    );
  });

  it('POST /curricular-imports responde 400 si falta csvContent', async () => {
    const response = await request(app.getHttpServer())
      .post('/curricular-imports')
      .send({ sourceName: 'prueba', sourceVersion: 'v1' })
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});
