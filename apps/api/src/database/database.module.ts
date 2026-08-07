import { Global, Module, type OnModuleDestroy, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL, pgPoolProvider } from './pg-pool.provider.js';

@Global()
@Module({
  providers: [pgPoolProvider],
  exports: [pgPoolProvider],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

export { PG_POOL };
