import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionService } from './session.service.js';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.js';

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class DevSessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException({
        code: 'MISSING_SESSION_TOKEN',
        message: 'Falta el encabezado Authorization: Bearer <token>.',
      });
    }

    const token = header.slice(BEARER_PREFIX.length).trim();
    const session = await this.sessionService.getSessionByToken(token);

    if (!session) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'La sesión no existe, expiró o fue revocada.',
      });
    }

    request.session = session;
    return true;
  }
}
