import { Global, Module } from '@nestjs/common';
import { apiConfigProvider, API_CONFIG } from './api-config.provider.js';

@Global()
@Module({
  providers: [apiConfigProvider],
  exports: [apiConfigProvider],
})
export class ConfigModule {}

export { API_CONFIG };
