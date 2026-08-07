import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, RequestSession } from '../types/authenticated-request.js';

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestSession => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.session;
  },
);
