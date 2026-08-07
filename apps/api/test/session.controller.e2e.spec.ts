import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { SessionController } from '../src/modules/session/session.controller.js';
import { SessionService } from '../src/modules/session/session.service.js';
import { DevSessionGuard } from '../src/modules/session/dev-session.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import type {
  AuthenticatedRequest,
  RequestSession,
} from '../src/common/types/authenticated-request.js';

/**
 * Regresión: @UsePipes a nivel de método valida TODOS los parámetros del
 * handler, no solo @Body(). En selectSchool eso rompía la validación porque
 * intentaba parsear el objeto de sesión (@CurrentSession) contra el schema
 * de { schoolId }. La corrección usa el pipe a nivel de parámetro
 * (`@Body(new ZodValidationPipe(...))`). Este test monta la app real vía
 * HTTP para que el bug no pueda reaparecer sin que un test lo detecte.
 */
describe('SessionController (e2e)', () => {
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

  beforeAll(async () => {
    const setActiveSchool = jest
      .fn<SessionService['setActiveSchool']>()
      .mockImplementation(async (session, schoolId) => ({ ...session, activeSchoolId: schoolId }));

    const moduleRef = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: { setActiveSchool } }],
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

  it('POST /session/school acepta un schoolId válido y responde 201', async () => {
    const schoolId = '11111111-1111-4111-8111-111111111111';
    const response = await request(app.getHttpServer())
      .post('/session/school')
      .send({ schoolId })
      .expect(201);

    expect(response.body.activeSchoolId).toBe(schoolId);
  });

  it('POST /session/school responde 400 si el body no tiene schoolId', async () => {
    const response = await request(app.getHttpServer())
      .post('/session/school')
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it('GET /session no se ve afectado por la validación del body', async () => {
    const response = await request(app.getHttpServer()).get('/session').expect(200);
    expect(response.body.token).toBe(fakeSession.token);
  });
});
