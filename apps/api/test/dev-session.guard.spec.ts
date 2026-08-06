import { jest } from '@jest/globals';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { DevSessionGuard } from '../src/modules/session/dev-session.guard.js';
import type { SessionService } from '../src/modules/session/session.service.js';
import type {
  AuthenticatedRequest,
  RequestSession,
} from '../src/common/types/authenticated-request.js';

function createContext(headers: Record<string, string>): {
  context: ExecutionContext;
  request: Partial<AuthenticatedRequest>;
} {
  const request: Partial<AuthenticatedRequest> = { headers } as never;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('DevSessionGuard', () => {
  it('rechaza cuando falta el header Authorization', async () => {
    const sessionService = { getSessionByToken: jest.fn() } as unknown as SessionService;
    const guard = new DevSessionGuard(sessionService);
    const { context } = createContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza cuando el token no corresponde a una sesión válida', async () => {
    const sessionService = {
      getSessionByToken: jest.fn().mockResolvedValue(null),
    } as unknown as SessionService;
    const guard = new DevSessionGuard(sessionService);
    const { context } = createContext({ authorization: 'Bearer invalido' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('adjunta la sesión al request cuando el token es válido', async () => {
    const fakeSession: RequestSession = {
      sessionId: 's1',
      token: 'valido',
      userId: 'u1',
      userEmail: 'persona@example.com',
      userDisplayName: 'Persona',
      activeSchoolId: null,
      expiresAt: new Date().toISOString(),
    };
    const sessionService = {
      getSessionByToken: jest.fn().mockResolvedValue(fakeSession),
    } as unknown as SessionService;
    const guard = new DevSessionGuard(sessionService);
    const { context, request } = createContext({ authorization: 'Bearer valido' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.session).toEqual(fakeSession);
  });
});
