import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { clamp } from '../common/text.utils';
import { DexscreenerPair } from '../dexscreener/dexscreener.types';
import { TokenMetadata } from '../token/token-enrichment.service';
import { EventTokenMatch } from './dto/event-token-match.dto';
import { DetectedEvent } from './dto/detected-event.dto';

export interface ScoredSignal {
  dexScore: number;
  eventMatchScore: number;
  tokenSocialScore: number;
  freshnessScore: number;
  finalScore: number;
  signalType:
    | 'BREAKING_EVENT_TOKEN'
    | 'EARLY_EVENT_MATCH'
    | 'CONFIRMED_EVENT_NARRATIVE'
    | 'WEAK_EVENT_ASSOCIATION'
    | 'REJECTED_NO_EVENT_MATCH'
    | 'REJECTED_LOW_LIQUIDITY'
    | 'REJECTED_SOCIAL_SPAM';
  reasonCodes: string[];
  riskNotes: string[];
}

@Injectable()
export class EventTokenScoringService {
  private readonly config: AppConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  score(
    pair: DexscreenerPair,
    event: DetectedEvent | undefined,
    match: EventTokenMatch | undefined,
    metadata: TokenMetadata,
  ): ScoredSignal {
    const liquidityUsd = pair.liquidity?.usd ?? 0;
    const volume1m = pair.volume?.m5 ? pair.volume.m5 / 5 : 0;
    const volume5m = pair.volume?.m5 ?? 0;
    const buys5m = pair.txns?.m5?.buys ?? 0;
    const sells5m = pair.txns?.m5?.sells ?? 0;
    const priceExpansion = Math.max(pair.priceChange?.m5 ?? 0, 0);
    const pairAgeMinutes = pair.pairCreatedAt
      ? Math.max(0, Math.floor((Date.now() - pair.pairCreatedAt) / 60_000))
      : this.config.maxPairAgeMinutes + 100;
    const dexScore = clamp(
      liquidityUsd / this.config.minLiquidityUsd * 22 +
        volume1m / Math.max(this.config.minVolume1mUsd, 1) * 18 +
        volume5m / Math.max(this.config.min5mVolumeUsd, 1) * 14 +
        buys5m * 1.5 -
        sells5m * 0.7 +
        priceExpansion * 1.2 +
        (pairAgeMinutes <= this.config.earlyPairAgeMinutes ? 20 : 8),
    );
    const eventMatchScore = match?.matchScore ?? 0;
    const tokenSocialScore = clamp(
      (match?.socialOverlapScore ?? 0) * 0.7 +
        (metadata.twitterUrl ? 12 : 0) +
        (metadata.telegramUrl ? 8 : 0),
    );
    const freshnessScore =
      pairAgeMinutes <= this.config.earlyPairAgeMinutes
        ? 100
        : pairAgeMinutes <= 15
          ? 75
          : pairAgeMinutes <= 30
            ? 50
            : 20;
    const finalScore = clamp(
      dexScore * this.config.dexScoreWeight +
        eventMatchScore * this.config.eventMatchWeight +
        tokenSocialScore * this.config.tokenSocialWeight +
        freshnessScore * this.config.freshnessScoreWeight,
    );

    const reasonCodes = [
      ...(match?.reasonCodes ?? []),
      ...(liquidityUsd >= this.config.minLiquidityUsd ? ['MIN_LIQUIDITY_OK'] : []),
      ...(pairAgeMinutes <= this.config.earlyPairAgeMinutes ? ['EARLY_PAIR_AGE'] : []),
      ...(event ? [`EVENT_CATEGORY_${event.category.toUpperCase()}`] : []),
    ];
    const riskNotes = [
      ...(liquidityUsd < this.config.minLiquidityUsd ? ['low liquidity'] : []),
      ...(!metadata.websiteText ? ['weak metadata'] : []),
      ...(eventMatchScore < this.config.minEventMatchScore ? ['only name match'] : []),
      ...(tokenSocialScore < this.config.minTokenSocialScore ? ['social spam risk'] : []),
      ...(event && event.velocity1m < this.config.minEventMentionVelocity1m ? ['event cooling down'] : []),
    ];

    let signalType: ScoredSignal['signalType'] = 'REJECTED_NO_EVENT_MATCH';
    if (liquidityUsd < this.config.minLiquidityUsd) {
      signalType = 'REJECTED_LOW_LIQUIDITY';
    } else if (tokenSocialScore < this.config.minTokenSocialScore / 2) {
      signalType = 'REJECTED_SOCIAL_SPAM';
    } else if (!match || eventMatchScore < this.config.minEventMatchScore) {
      signalType = 'WEAK_EVENT_ASSOCIATION';
    } else if (
      pairAgeMinutes <= this.config.earlyPairAgeMinutes &&
      finalScore >= this.config.minBreakingEventTokenScore
    ) {
      signalType = 'BREAKING_EVENT_TOKEN';
    } else if (finalScore >= this.config.minEarlyEventMatchScore) {
      signalType = 'EARLY_EVENT_MATCH';
    } else if (finalScore >= this.config.minConfirmedEventNarrativeScore) {
      signalType = 'CONFIRMED_EVENT_NARRATIVE';
    }

    return {
      dexScore,
      eventMatchScore,
      tokenSocialScore,
      freshnessScore,
      finalScore,
      signalType,
      reasonCodes: Array.from(new Set(reasonCodes)),
      riskNotes,
    };
  }
}
