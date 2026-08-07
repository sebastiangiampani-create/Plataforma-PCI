import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import type { PciProjectSummary } from '@pci/domain';
import { PciProjectsController } from '../src/modules/pci-projects/pci-projects.controller.js';
import { PciProjectsService } from '../src/modules/pci-projects/pci-projects.service.js';
import { DevSessionGuard } from '../src/modules/session/dev-session.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import type {
  AuthenticatedRequest,
  RequestSession,
} from '../src/common/types/authenticated-request.js';

describe('PciProjectsController (e2e)', () => {
  let app: INestApplication;
  let currentSession: RequestSession;
  const withSchool: RequestSession = {
    sessionId: 'session-1',
    token: 'token-1',
    userId: 'user-1',
    userEmail: 'persona@example.com',
    userDisplayName: 'Persona',
    activeSchoolId: '11111111-1111-4111-8111-111111111111',
    expiresAt: new Date().toISOString(),
  };
  const withoutSchool: RequestSession = { ...withSchool, activeSchoolId: null };
  const fakeProject: PciProjectSummary = {
    id: '22222222-2222-4222-8222-222222222222',
    schoolId: withSchool.activeSchoolId!,
    name: 'PCI Escuela 1',
    status: 'DRAFT',
    currentVersion: {
      id: '33333333-3333-4333-8333-333333333333',
      pciProjectId: '22222222-2222-4222-8222-222222222222',
      versionNumber: 1,
      status: 'DRAFT',
      pedagogicalRationale: null,
      createdBy: withSchool.userId,
      publishedBy: null,
      createdAt: new Date().toISOString(),
      publishedAt: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let createProject: jest.Mock<PciProjectsService['createProject']>;

  beforeAll(async () => {
    createProject = jest.fn<PciProjectsService['createProject']>().mockResolvedValue(fakeProject);

    const moduleRef = await Test.createTestingModule({
      controllers: [PciProjectsController],
      providers: [
        {
          provide: PciProjectsService,
          useValue: {
            createProject,
            listForSchool: jest.fn(),
            getProject: jest.fn(),
            createVersion: jest.fn(),
            updateVersion: jest.fn(),
            publishVersion: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(DevSessionGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
          req.session = currentSession;
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

  it('POST /pci-projects responde 403 sin escuela activa', async () => {
    currentSession = withoutSchool;
    const response = await request(app.getHttpServer())
      .post('/pci-projects')
      .send({ name: 'PCI Escuela 1' })
      .expect(403);
    expect(response.body.error.code).toBe('NO_ACTIVE_SCHOOL');
  });

  it('POST /pci-projects responde 400 si falta name', async () => {
    currentSession = withSchool;
    const response = await request(app.getHttpServer()).post('/pci-projects').send({}).expect(400);
    expect(response.body.error).toBeDefined();
  });

  it('POST /pci-projects crea el proyecto con la escuela activa y el userId de la sesión', async () => {
    currentSession = withSchool;
    const response = await request(app.getHttpServer())
      .post('/pci-projects')
      .send({ name: 'PCI Escuela 1' })
      .expect(201);

    expect(response.body).toMatchObject({ id: fakeProject.id });
    expect(createProject).toHaveBeenCalledWith(
      withSchool.activeSchoolId,
      'PCI Escuela 1',
      withSchool.userId,
    );
  });
});
