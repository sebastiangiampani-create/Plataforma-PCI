import type { SessionResponse } from '@pci/domain';
import type { RequestSession } from '../../common/types/authenticated-request.js';

export function toSessionResponse(session: RequestSession): SessionResponse {
  return {
    token: session.token,
    user: { id: session.userId, email: session.userEmail, displayName: session.userDisplayName },
    activeSchoolId: session.activeSchoolId,
    expiresAt: session.expiresAt,
  };
}
