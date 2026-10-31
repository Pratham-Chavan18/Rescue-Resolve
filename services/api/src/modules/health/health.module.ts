import { Module, forwardRef } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
