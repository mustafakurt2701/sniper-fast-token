import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DexscreenerModule } from '../dexscreener/dexscreener.module';
import { EventModule } from '../event/event.module';
import { TokenModule } from '../token/token.module';
import { ChainRiskModule } from './chain-risk.module';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';
import { ScamFilterService } from './scam-filter.service';
import { TelegramService } from './telegram.service';

@Module({
  imports: [HttpModule, DexscreenerModule, ChainRiskModule, EventModule, TokenModule],
  controllers: [SignalsController],
  providers: [SignalsService, ScamFilterService, TelegramService],
})
export class SignalsModule {}
