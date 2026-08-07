import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import type { ValidationRunResponse } from '@pci/domain';
import { ValidationController } from '../src/modules/validation/validation.controller.js';
import { ValidationService } from '../src/modules/validation/validation.service.js';
import { DevSessionGuard } from '../src/modules/session/dev-session.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import type {
  AuthenticatedRequest,
  RequestSession,
} from '../src/common/types/authenticated-request.js';

describe('ValidationController (e2e)', () => {
  let app: INestApplication;
  const fakeSession: RequestSession = {
    sessionId: 'session-1',
    token: 'token-1',
    userId: 'user-1',
    userEmail: 'persona@example.com',
    userDisplayName: 'Persona',
    activeSchoolId: '11111111-1111-4111-8111-111111111111',
    expiresAt: new Date().toISOString(),
  };
  const versionId = '22222222-2222-4222-8222-222222222222';
  const fakeResponse: ValidationRunResponse = {
    summary: [
      {
        ruleCode: 'PCI-COV-001',
        ruleName: 'Cobertura de contenidos',
        severity: 'WARNING',
        count: 3,
      },
    ],
    results: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        ruleCode: 'PCI-COV-001',
        ruleName: 'Cobertura de contenidos',
        severity: 'WARNING',
        entityType: 'curricular_content',
        entityId: '44444444-4444-4444-8444-444444444444',
        message: 'El contenido "c1" no está asignado a ningún espacio curricular de esta versión.',
        cause: null,
        impact: null,
        suggestedAction: null,
      },
    ],
    truncated: false,
  };

  let run: jest.Mock<ValidationService['run']>;
  let currentResults: jest.Mock<ValidationService['currentResults']>;

  beforeAll(async () => {
    run = jest.fn<ValidationService['run']>().mockResolvedValue(fakeResponse);
    currentResults = jest.fn<ValidationService['currentResults']>().mockResolvedValue(fakeResponse);

    const moduleRef = await Test.createTestingModule({
      controllers: [ValidationController],
      providers: [{ provide: ValidationService, useValue: { run, currentResults } }],
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

  it('POST .../validate corre el motor de reglas y devuelve el resultado', async () => {
    const response = await request(app.getHttpServer())
      .post(`/pci-versions/${versionId}/validate`)
      .expect(201);

    expect(response.body).toEqual(fakeResponse);
    expect(run).toHaveBeenCalledWith(fakeSession.activeSchoolId, versionId);
  });

  it('GET .../validation-results devuelve el último resultado sin re-ejecutar', async () => {
    const response = await request(app.getHttpServer())
      .get(`/pci-versions/${versionId}/validation-results`)
      .expect(200);

    expect(response.body).toEqual(fakeResponse);
    expect(currentResults).toHaveBeenCalledWith(fakeSession.activeSchoolId, versionId);
  });
});
