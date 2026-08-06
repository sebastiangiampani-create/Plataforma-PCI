import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SessionModule } from './modules/session/session.module.js';
import { SchoolsModule } from './modules/schools/schools.module.js';

@Module({
  imports: [ConfigModule, DatabaseModule, HealthModule, AuthModule, SessionModule, SchoolsModule],
})
export class AppModule {}
