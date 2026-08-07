import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import type { CurricularSpaceSummary } from '@pci/domain';
import { CurricularSpacesController } from '../src/modules/curricular-spaces/curricular-spaces.controller.js';
import { CurricularSpacesService } from '../src/modules/curricular-spaces/curricular-spaces.service.js';
import { DevSessionGuard } from '../src/modules/session/dev-session.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import type {
  AuthenticatedRequest,
  RequestSession,
} from '../src/common/types/authenticated-request.js';

describe('CurricularSpacesController (e2e)', () => {
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
  const fakeSpace: CurricularSpaceSummary = {
    id: '22222222-2222-4222-8222-222222222222',
    pciVersionId: '33333333-3333-4333-8333-333333333333',
    code: 'LAB-1',
    name: 'Laboratorio 1',
    componentCode: 'FORMACION_GENERAL',
    orientationCode: null,
    spaceType: 'AUTONOMO',
    formatType: 'LABORATORIO',
    characterType: 'OBLIGATORIO',
    levelNumber: 3,
    startTerm: 5,
    endTerm: 6,
    objectives: null,
    problemContext: null,
    observations: null,
    status: 'ACTIVE',
    areas: [],
    contentCount: 0,
  };

  let createSpace: jest.Mock<CurricularSpacesService['createSpace']>;

  beforeAll(async () => {
    createSpace = jest.fn<CurricularSpacesService['createSpace']>().mockResolvedValue(fakeSpace);

    const moduleRef = await Test.createTestingModule({
      controllers: [CurricularSpacesController],
      providers: [
        {
          provide: CurricularSpacesService,
          useValue: {
            createSpace,
            listForVersion: jest.fn(),
            getSpace: jest.fn(),
            listAssignments: jest.fn(),
            assignContent: jest.fn(),
            unassignContent: jest.fn(),
          },
        },
      ],
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

  it('POST /pci-versions/:versionId/curricular-spaces responde 400 si el rango de cuatrimestres no corresponde al nivel', async () => {
    const response = await request(app.getHttpServer())
      .post(`/pci-versions/${fakeSpace.pciVersionId}/curricular-spaces`)
      .send({
        code: 'LAB-1',
        name: 'Laboratorio 1',
        componentCode: 'FORMACION_GENERAL',
        spaceType: 'AUTONOMO',
        formatType: 'LABORATORIO',
        characterType: 'OBLIGATORIO',
        levelNumber: 3,
        startTerm: 1,
        endTerm: 2,
        areaCodes: ['CIENCIAS_NATURALES'],
      })
      .expect(400);

    expect(response.body.error.details?.[0]).toContain('PCI-STR-002');
  });

  it('POST /pci-versions/:versionId/curricular-spaces crea el espacio con un body válido', async () => {
    const response = await request(app.getHttpServer())
      .post(`/pci-versions/${fakeSpace.pciVersionId}/curricular-spaces`)
      .send({
        code: 'LAB-1',
        name: 'Laboratorio 1',
        componentCode: 'FORMACION_GENERAL',
        spaceType: 'AUTONOMO',
        formatType: 'LABORATORIO',
        characterType: 'OBLIGATORIO',
        levelNumber: 3,
        startTerm: 5,
        endTerm: 6,
        areaCodes: ['CIENCIAS_NATURALES'],
      })
      .expect(201);

    expect(response.body).toMatchObject({ id: fakeSpace.id });
    expect(createSpace).toHaveBeenCalledWith(
      fakeSession.activeSchoolId,
      fakeSpace.pciVersionId,
      expect.objectContaining({ code: 'LAB-1' }),
    );
  });
});
