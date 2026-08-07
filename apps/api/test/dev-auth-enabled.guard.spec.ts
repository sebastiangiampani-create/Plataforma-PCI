import { NotFoundException } from '@nestjs/common';
import type { ApiConfig } from '@pci/config';
import { DevAuthEnabledGuard } from '../src/modules/auth/dev-auth-enabled.guard.js';

function fakeConfig(devAuthEnabled: boolean): ApiConfig {
  return { DEV_AUTH_ENABLED: devAuthEnabled } as ApiConfig;
}

describe('DevAuthEnabledGuard', () => {
  it('permite el paso cuando DEV_AUTH_ENABLED es true', () => {
    const guard = new DevAuthEnabledGuard(fakeConfig(true));
    expect(guard.canActivate()).toBe(true);
  });

  it('lanza NotFoundException (404) cuando DEV_AUTH_ENABLED es false', () => {
    const guard = new DevAuthEnabledGuard(fakeConfig(false));
    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });
});
