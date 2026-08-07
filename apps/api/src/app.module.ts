import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SessionModule } from './modules/session/session.module.js';
import { SchoolsModule } from './modules/schools/schools.module.js';
import { CurricularImportsModule } from './modules/curricular-imports/curricular-imports.module.js';
import { CurricularContentsModule } from './modules/curricular-contents/curricular-contents.module.js';
import { PciProjectsModule } from './modules/pci-projects/pci-projects.module.js';
import { CurricularSpacesModule } from './modules/curricular-spaces/curricular-spaces.module.js';
import { WeeklyHoursModule } from './modules/weekly-hours/weekly-hours.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    SessionModule,
    SchoolsModule,
    CurricularImportsModule,
    CurricularContentsModule,
    PciProjectsModule,
    CurricularSpacesModule,
    WeeklyHoursModule,
  ],
})
export class AppModule {}
