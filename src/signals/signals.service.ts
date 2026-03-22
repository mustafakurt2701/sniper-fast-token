import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { DexscreenerService } from '../dexscreener/dexscreener.service';
import { DexscreenerPair } from '../dexscreener/dexscreener.types';
import { ScamFilterService } from './scam-filter.service';
import { CandidateSignal, SignalPayload } from './signal.types';
import { TelegramService } from './telegram.service';
import { WebhookService } from './webhook.service';

@Injectable()
export class SignalsService implements OnModuleInit {
  private readonly logger = new Logger(SignalsService.name);
  private readonly config: AppConfig;
  private readonly sentSignalKeys = new Map<string, number>();
  private scanTimer?: NodeJS.Timeout;
  private isScanning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly dexscreenerService: DexscreenerService,
    private readonly scamFilterService: ScamFilterService,
    private readonly webhookService: WebhookService,
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
      const candidates = await this.collectCandidates();
      const approvedSignals: SignalPayload[] = [];

      for (const candidate of candidates) {
        const assessment = await this.scamFilterService.assess(candidate);
        const payload = this.toPayload(candidate, assessment);

        await this.telegramService.sendSignal(payload);

        if (!assessment.approved) {
          continue;
        }

        const dedupeKey = `${payload.chainId}:${payload.pairAddress}:${payload.progress}`;
        if (this.shouldSkipSignal(dedupeKey)) {
          continue;
        }

        await this.webhookService.dispatch(payload);
        approvedSignals.push(payload);
        this.sentSignalKeys.set(dedupeKey, Date.now());
      }

      this.pruneDedupeCache();
      return approvedSignals;
    } finally {
      this.isScanning = false;
    }
  }

  async previewSignals(): Promise<SignalPayload[]> {
    const candidates = await this.collectCandidates();
    const previews = await Promise.all(
      candidates.map(async (candidate) => {
        const assessment = await this.scamFilterService.assess(candidate);
        if (!assessment.approved) {
          return null;
        }

        return this.toPayload(candidate, assessment);
      }),
    );

    return previews
      .filter((item): item is SignalPayload => item !== null)
      .sort((left, right) => right.momentumScore - left.momentumScore);
  }

  async ingestPair(pair: DexscreenerPair): Promise<SignalPayload | null> {
    const candidate: CandidateSignal = {
      pair,
      progress: this.scamFilterService.estimateProgress(pair),
      momentumScore: this.scamFilterService.computeMomentumScore(pair),
    };

    const assessment = await this.scamFilterService.assess(candidate);
    if (!assessment.approved) {
      return null;
    }

    const payload = this.toPayload(candidate, assessment);
    const dedupeKey = `${payload.chainId}:${payload.pairAddress}:${payload.progress}`;
    if (this.shouldSkipSignal(dedupeKey)) {
      return null;
    }

    await Promise.all([
      this.webhookService.dispatch(payload),
      this.telegramService.sendSignal(payload),
    ]);
    this.sentSignalKeys.set(dedupeKey, Date.now());
    return payload;
  }

  private async collectCandidates(): Promise<CandidateSignal[]> {
    const latestProfiles = await this.dexscreenerService.getLatestTokenProfiles();
    const profiles = latestProfiles
      .filter((profile) => this.config.chainIds.includes(profile.chainId))
      .slice(0, this.config.latestProfilesLimit);
    const allPairs = await Promise.all(
      profiles.map((profile) =>
        this.dexscreenerService.getTokenPairs(profile.chainId, profile.tokenAddress),
      ),
    );
    const uniquePairs = new Map<string, DexscreenerPair>();
    const now = Date.now();

    for (const batch of allPairs) {
      for (const pair of batch) {
        uniquePairs.set(`${pair.chainId}:${pair.pairAddress}`, pair);
      }
    }

    return Array.from(uniquePairs.values())
      .filter((pair) => this.config.chainIds.includes(pair.chainId))
      .filter((pair) => {
        if (!pair.pairCreatedAt) {
          return false;
        }

        const pairAgeMinutes = Math.max(0, Math.floor((now - pair.pairCreatedAt) / 60000));
        return pairAgeMinutes <= this.config.maxPairAgeMinutes;
      })
      .map((pair) => ({
        pair,
        progress: this.scamFilterService.estimateProgress(pair),
        momentumScore: this.scamFilterService.computeMomentumScore(pair),
      }))
      .filter((candidate) => candidate.momentumScore > 25)
      .sort((left, right) => right.momentumScore - left.momentumScore)
      .slice(0, 20);
  }

  private toPayload(
    candidate: CandidateSignal,
    assessment: Awaited<ReturnType<ScamFilterService['assess']>>,
  ): SignalPayload {
    const { pair, progress, momentumScore } = candidate;

    return {
      type: 'progress_signal',
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
      metrics: {
        liquidityUsd: pair.liquidity?.usd ?? 0,
        volume5mUsd: pair.volume?.m5 ?? 0,
        buys5m: pair.txns?.m5?.buys ?? 0,
        sells5m: pair.txns?.m5?.sells ?? 0,
        priceChange5mPct: pair.priceChange?.m5 ?? 0,
        marketCap: pair.marketCap,
        fdv: pair.fdv,
        activeBoosts: pair.boosts?.active ?? 0,
        pairAgeMinutes: pair.pairCreatedAt
          ? Math.max(0, Math.floor((Date.now() - pair.pairCreatedAt) / 60000))
          : undefined,
        topHolderPct: assessment.chainRisk?.solana?.topHolderPct,
        top5HolderPct: assessment.chainRisk?.solana?.top5HolderPct,
        mintAuthorityRenounced: assessment.chainRisk?.solana?.mintAuthorityRenounced,
        freezeAuthorityRenounced: assessment.chainRisk?.solana?.freezeAuthorityRenounced,
      },
      discoveredAt: new Date().toISOString(),
    };
  }

  private shouldSkipSignal(key: string): boolean {
    const previous = this.sentSignalKeys.get(key);
    if (previous === undefined) {
      return false;
    }

    return Date.now() - previous < 15 * 60 * 1000;
  }

  private pruneDedupeCache(): void {
    const ttl = 60 * 60 * 1000;
    for (const [key, seenAt] of this.sentSignalKeys.entries()) {
      if (Date.now() - seenAt > ttl) {
        this.sentSignalKeys.delete(key);
      }
    }
  }
}
