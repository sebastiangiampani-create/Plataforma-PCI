import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import type { WeeklyHoursEntry } from '@pci/domain';
import { WeeklyHoursController } from '../src/modules/weekly-hours/weekly-hours.controller.js';
import { WeeklyHoursService } from '../src/modules/weekly-hours/weekly-hours.service.js';
import { DevSessionGuard } from '../src/modules/session/dev-session.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import type {
  AuthenticatedRequest,
  RequestSession,
} from '../src/common/types/authenticated-request.js';

describe('WeeklyHoursController (e2e)', () => {
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
  const spaceId = '22222222-2222-4222-8222-222222222222';
  const fakeEntries: WeeklyHoursEntry[] = [
    {
      id: '33333333-3333-4333-8333-333333333333',
      termNumber: 1,
      areaCode: 'MATEMATICA',
      areaName: 'Matemática',
      hours: 5,
    },
  ];

  let set: jest.Mock<WeeklyHoursService['set']>;

  beforeAll(async () => {
    set = jest.fn<WeeklyHoursService['set']>().mockResolvedValue(fakeEntries);

    const moduleRef = await Test.createTestingModule({
      controllers: [WeeklyHoursController],
      providers: [
        {
          provide: WeeklyHoursService,
          useValue: { set, list: jest.fn(), suggestions: jest.fn(), remove: jest.fn() },
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

  it('PUT .../weekly-hours responde 400 si hours es negativo', async () => {
    const response = await request(app.getHttpServer())
      .put(`/curricular-spaces/${spaceId}/weekly-hours`)
      .send({ areaCode: 'MATEMATICA', termNumber: 1, hours: -1 })
      .expect(400);
    expect(response.body.error).toBeDefined();
  });

  it('PUT .../weekly-hours carga la hora con un body válido', async () => {
    const response = await request(app.getHttpServer())
      .put(`/curricular-spaces/${spaceId}/weekly-hours`)
      .send({ areaCode: 'MATEMATICA', termNumber: 1, hours: 5 })
      .expect(200);

    expect(response.body).toEqual(fakeEntries);
    expect(set).toHaveBeenCalledWith(fakeSession.activeSchoolId, spaceId, {
      areaCode: 'MATEMATICA',
      termNumber: 1,
      hours: 5,
    });
  });
});
