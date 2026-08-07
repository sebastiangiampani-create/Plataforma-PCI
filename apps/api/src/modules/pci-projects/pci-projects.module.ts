import { Module } from '@nestjs/common';
import { PciProjectsController } from './pci-projects.controller.js';
import { PciProjectsService } from './pci-projects.service.js';
import { SessionModule } from '../session/session.module.js';

@Module({
  imports: [SessionModule],
  controllers: [PciProjectsController],
  providers: [PciProjectsService],
})
export class PciProjectsModule {}
