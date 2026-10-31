import { Module, forwardRef } from '@nestjs/common';
import { RescueController } from './rescue.controller';
import { RescueService } from './rescue.service';
import { LedgerModule } from '../ledger/ledger.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [LedgerModule, forwardRef(() => RealtimeModule)],
  controllers: [RescueController],
  providers: [RescueService],
  exports: [RescueService],
})
export class RescueModule {}
