import { Module } from '@nestjs/common';
import { WeeklyHoursController } from './weekly-hours.controller.js';
import { WeeklyHoursService } from './weekly-hours.service.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [SessionModule],
  controllers: [WeeklyHoursController],
  providers: [WeeklyHoursService],
})
export class WeeklyHoursModule {}
