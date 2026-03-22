import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DexscreenerModule } from '../dexscreener/dexscreener.module';
import { ChainRiskModule } from './chain-risk.module';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';
import { ScamFilterService } from './scam-filter.service';
import { WebhookService } from './webhook.service';

@Module({
  imports: [HttpModule, DexscreenerModule, ChainRiskModule],
  controllers: [SignalsController],
  providers: [SignalsService, ScamFilterService, WebhookService],
})
export class SignalsModule {}
