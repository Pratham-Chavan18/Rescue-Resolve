import { Module, forwardRef } from '@nestjs/common';
import { ResolveController } from './resolve.controller';
import { ResolveService } from './resolve.service';
import { LedgerModule } from '../ledger/ledger.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [LedgerModule, forwardRef(() => RealtimeModule)],
  controllers: [ResolveController],
  providers: [ResolveService],
  exports: [ResolveService],
})
export class ResolveModule {}
