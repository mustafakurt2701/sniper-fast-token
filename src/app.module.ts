import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { SignalsModule } from './signals/signals.module';
import { DexscreenerModule } from './dexscreener/dexscreener.module';
import { appConfig } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    HealthModule,
    DexscreenerModule,
    SignalsModule,
  ],
})
export class AppModule {}
