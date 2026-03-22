import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { DEX_SIGNAL_PROVIDER, DexSignalProvider } from '../dexscreener/providers/dex-signal-provider.interface';
import { DexscreenerPair } from '../dexscreener/dexscreener.types';
import { ActiveEventState } from '../event/active-event-state.service';
import { EventService } from '../event/event.service';
import { EventTokenScoringService } from '../event/event-token-scoring.service';
import { NarrativeMatchingService } from '../event/narrative-matching.service';
import { SocialPostService } from '../social/social-post.service';
import { TokenEnrichmentService } from '../token/token-enrichment.service';
import { ScamFilterService } from './scam-filter.service';
import { CandidateSignal, SignalPayload, SignalType } from './signal.types';
import { TelegramService } from './telegram.service';

const ALERT_SIGNAL_TYPES = new Set<SignalType>([
  'BREAKING_EVENT_TOKEN',
  'EARLY_EVENT_MATCH',
  'CONFIRMED_EVENT_NARRATIVE',
]);

@Injectable()
export class SignalsService implements OnModuleInit {
  private readonly logger = new Logger(SignalsService.name);
  private readonly config: AppConfig;
  private readonly sentSignalKeys = new Map<string, number>();
  private scanTimer?: NodeJS.Timeout;
  private isScanning = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DEX_SIGNAL_PROVIDER) private readonly dexSignalProvider: DexSignalProvider,
    private readonly eventService: EventService,
    private readonly narrativeMatchingService: NarrativeMatchingService,
    private readonly eventTokenScoringService: EventTokenScoringService,
    private readonly socialPostService: SocialPostService,
    private readonly tokenEnrichmentService: TokenEnrichmentService,
    private readonly scamFilterService: ScamFilterService,
    private readonly telegramService: TelegramService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  onModuleInit(): void {
    this.scanTimer = setInterval(() => {
      void this.scanOnce();
    }, this.config.scanIntervalMs);

    void this.scanOnce();
  }

  async scanOnce(): Promise<SignalPayload[]> {
    if (this.isScanning) {
      return [];
    }

    this.isScanning = true;

    try {
      const evaluated = await this.evaluateFreshPairs();
      const alerts: SignalPayload[] = [];

      for (const payload of evaluated) {
        if (!ALERT_SIGNAL_TYPES.has(payload.signalType)) {
          continue;
        }

        const dedupeKey = this.buildDedupeKey(payload);
        if (this.shouldSkipSignal(dedupeKey)) {
          continue;
        }

        await this.telegramService.sendSignal(payload);
        alerts.push(payload);
        this.sentSignalKeys.set(dedupeKey, Date.now());
      }

      this.pruneDedupeCache();
      return alerts;
    } finally {
      this.isScanning = false;
    }
  }

  async previewSignals(): Promise<SignalPayload[]> {
    const evaluated = await this.evaluateFreshPairs();
    return evaluated.sort((left, right) => right.finalScore - left.finalScore);
  }

  async ingestPair(pair: DexscreenerPair): Promise<SignalPayload | null> {
    const payload = await this.evaluatePair(pair);
    if (!ALERT_SIGNAL_TYPES.has(payload.signalType)) {
      return null;
    }

    const dedupeKey = this.buildDedupeKey(payload);
    if (this.shouldSkipSignal(dedupeKey)) {
      return null;
    }

    await this.telegramService.sendSignal(payload);
    this.sentSignalKeys.set(dedupeKey, Date.now());
    return payload;
  }

  private async evaluateFreshPairs(): Promise<SignalPayload[]> {
    const [pairs, activeEvents, socialPosts] = await Promise.all([
      this.dexSignalProvider.getFreshPairs(),
      this.eventService.getActiveEvents(),
      this.socialPostService.getRecentPosts(),
    ]);

    const payloads = await Promise.all(
      pairs.map((pair) => this.evaluatePair(pair, activeEvents, socialPosts)),
    );

    return payloads.slice(0, this.config.latestProfilesLimit);
  }

  private async evaluatePair(
    pair: DexscreenerPair,
    activeEvents?: ActiveEventState[],
    socialPosts?: Awaited<ReturnType<SocialPostService['getRecentPosts']>>,
  ): Promise<SignalPayload> {
    const [events, posts, metadata] = await Promise.all([
      activeEvents ? Promise.resolve(activeEvents) : this.eventService.getActiveEvents(),
      socialPosts ? Promise.resolve(socialPosts) : this.socialPostService.getRecentPosts(),
      this.tokenEnrichmentService.enrich(pair),
    ]);
    const candidate: CandidateSignal = {
      pair,
      progress: this.scamFilterService.estimateProgress(pair),
      momentumScore: this.scamFilterService.computeMomentumScore(pair),
      metadata,
    };
    const assessment = await this.scamFilterService.assess(candidate);
    const bestMatch = this.findBestEventMatch(pair, metadata, events, posts);
    const scoring = this.eventTokenScoringService.score(
      pair,
      bestMatch?.eventState.event,
      bestMatch?.match,
      metadata,
    );

    return this.toPayload(candidate, assessment, bestMatch?.eventState, bestMatch?.match, scoring);
  }

  private findBestEventMatch(
    pair: DexscreenerPair,
    metadata: CandidateSignal['metadata'],
    activeEvents: ActiveEventState[],
    posts: Awaited<ReturnType<SocialPostService['getRecentPosts']>>,
  ): { eventState: ActiveEventState; match: ReturnType<NarrativeMatchingService['match']> } | undefined {
    if (!metadata) {
      return undefined;
    }

    let best:
      | { eventState: ActiveEventState; match: ReturnType<NarrativeMatchingService['match']> }
      | undefined;

    for (const eventState of activeEvents) {
      const match = this.narrativeMatchingService.match(eventState.profile, pair, metadata, posts);
      if (!best || match.matchScore > best.match.matchScore) {
        best = { eventState, match };
      }
    }

    return best;
  }

  private toPayload(
    candidate: CandidateSignal,
    assessment: Awaited<ReturnType<ScamFilterService['assess']>>,
    eventState: ActiveEventState | undefined,
    eventMatch: CandidateSignal['eventMatch'],
    scoring: ReturnType<EventTokenScoringService['score']>,
  ): SignalPayload {
    const { pair, progress, momentumScore } = candidate;
    const pairAgeMinutes = pair.pairCreatedAt
      ? Math.max(0, Math.floor((Date.now() - pair.pairCreatedAt) / 60_000))
      : undefined;

    return {
      type: 'progress_signal',
      signalType: scoring.signalType,
      chainId: pair.chainId,
      tokenAddress: pair.baseToken.address,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      pairAddress: pair.pairAddress,
      pairUrl: pair.url,
      progress,
      momentumScore,
      scamScore: assessment.score,
      checks: assessment.checks,
      matchedEvent: eventState
        ? {
            eventId: eventState.event.eventId,
            title: eventState.event.title,
            category: eventState.event.category,
            source: eventState.event.source,
            confidence: eventState.event.confidence,
          }
        : undefined,
      eventCategory: eventState?.event.category,
      eventMatchScore: scoring.eventMatchScore,
      tokenSocialScore: scoring.tokenSocialScore,
      dexScore: scoring.dexScore,
      freshnessScore: scoring.freshnessScore,
      finalScore: scoring.finalScore,
      reasonCodes: scoring.reasonCodes,
      riskNotes: scoring.riskNotes,
      eventTokenMatch: eventMatch,
      metrics: {
        liquidityUsd: pair.liquidity?.usd ?? 0,
        volume1mUsd: (pair.volume?.m5 ?? 0) / 5,
        volume5mUsd: pair.volume?.m5 ?? 0,
        buys5m: pair.txns?.m5?.buys ?? 0,
        sells5m: pair.txns?.m5?.sells ?? 0,
        priceChange5mPct: pair.priceChange?.m5 ?? 0,
        marketCap: pair.marketCap,
        fdv: pair.fdv,
        activeBoosts: pair.boosts?.active ?? 0,
        pairAgeMinutes,
        topHolderPct: assessment.chainRisk?.solana?.topHolderPct,
        top5HolderPct: assessment.chainRisk?.solana?.top5HolderPct,
        mintAuthorityRenounced: assessment.chainRisk?.solana?.mintAuthorityRenounced,
        freezeAuthorityRenounced: assessment.chainRisk?.solana?.freezeAuthorityRenounced,
      },
      discoveredAt: new Date().toISOString(),
    };
  }

  private buildDedupeKey(payload: SignalPayload): string {
    return `${payload.matchedEvent?.eventId ?? 'no-event'}:${payload.tokenAddress}`;
  }

  private shouldSkipSignal(key: string): boolean {
    const previous = this.sentSignalKeys.get(key);
    if (previous === undefined) {
      return false;
    }

    return Date.now() - previous < this.config.activeEventWindowMinutes * 60_000;
  }

  private pruneDedupeCache(): void {
    const ttl = this.config.activeEventWindowMinutes * 60_000;
    for (const [key, seenAt] of this.sentSignalKeys.entries()) {
      if (Date.now() - seenAt > ttl) {
        this.sentSignalKeys.delete(key);
      }
    }
  }
}
