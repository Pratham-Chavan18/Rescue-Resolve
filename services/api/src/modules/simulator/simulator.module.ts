import { Module, forwardRef } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { HealthModule } from '../health/health.module';
import { RescueModule } from '../rescue/rescue.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => HealthModule), forwardRef(() => RescueModule), RealtimeModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
