import { type CanActivate, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ApiConfig } from '@pci/config';
import { API_CONFIG } from '../../config/config.module.js';

/**
 * Oculta por completo el endpoint de login de desarrollo (404, no 403) cuando
 * DEV_AUTH_ENABLED es false. AGENTS.md exige que la autenticación de
 * desarrollo esté "explícitamente controlada por variable de entorno" y
 * @pci/config ya fuerza DEV_AUTH_ENABLED=false fuera de NODE_ENV=development.
 */
@Injectable()
export class DevAuthEnabledGuard implements CanActivate {
  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.DEV_AUTH_ENABLED) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Recurso no encontrado.' });
    }
    return true;
  }
}
