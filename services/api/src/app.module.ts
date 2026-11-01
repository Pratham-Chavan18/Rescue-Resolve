import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { OrdersModule } from './modules/orders/orders.module';
import { HealthModule } from './modules/health/health.module';
import { RescueModule } from './modules/rescue/rescue.module';
import { ResolveModule } from './modules/resolve/resolve.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PartnersModule } from './modules/partners/partners.module';
import { AgentModule } from './modules/agent/agent.module';
import { SimulatorModule } from './modules/simulator/simulator.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './modules/storage/storage.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    RedisModule,
    AuthModule,
    OrdersModule,
    HealthModule,
    RescueModule,
    ResolveModule,
    LedgerModule,
    PartnersModule,
    AgentModule,
    SimulatorModule,
    RealtimeModule,
  ],
})
export class AppModule {}
