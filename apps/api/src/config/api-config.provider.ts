import type { Provider } from '@nestjs/common';
import { loadApiConfig, type ApiConfig } from '@pci/config';

export const API_CONFIG = Symbol('API_CONFIG');

export const apiConfigProvider: Provider = {
  provide: API_CONFIG,
  useFactory: (): ApiConfig => loadApiConfig(process.env),
};
