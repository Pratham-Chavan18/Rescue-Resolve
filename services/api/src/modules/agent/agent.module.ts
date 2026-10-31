import { Module, forwardRef } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { LedgerModule } from '../ledger/ledger.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [LedgerModule, forwardRef(() => RealtimeModule)],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
