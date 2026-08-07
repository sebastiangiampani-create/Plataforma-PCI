import type { Request } from 'express';

export interface RequestSession {
  sessionId: string;
  token: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  activeSchoolId: string | null;
  expiresAt: string;
}

export interface AuthenticatedRequest extends Request {
  session: RequestSession;
}
