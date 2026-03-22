import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { DexscreenerPair } from '../dexscreener/dexscreener.types';
import { SolanaRiskService } from './solana-risk.service';
import { CandidateSignal, ScamAssessment, ScamRiskCheck } from './signal.types';

@Injectable()
export class ScamFilterService {
  private readonly config: AppConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly solanaRiskService: SolanaRiskService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  estimateProgress(pair: DexscreenerPair): number {
    const marketCap = pair.marketCap ?? pair.fdv ?? 0;
    if (marketCap <= 0) {
      return 0;
    }

    const inferredProgress = (marketCap / 69000) * 100;
    return Math.max(0, Math.min(100, Math.round(inferredProgress)));
  }

  computeMomentumScore(pair: DexscreenerPair): number {
    const buys5m = pair.txns?.m5?.buys ?? 0;
    const sells5m = pair.txns?.m5?.sells ?? 0;
    const volume5m = pair.volume?.m5 ?? 0;
    const priceChange5m = pair.priceChange?.m5 ?? 0;
    const liquidityUsd = pair.liquidity?.usd ?? 0;
    const activeBoosts = pair.boosts?.active ?? 0;

    return Math.round(
      buys5m * 1.8 -
        sells5m * 0.8 +
        volume5m / 1800 +
        Math.max(priceChange5m, 0) * 1.5 +
        liquidityUsd / 9000 +
        activeBoosts * 4,
    );
  }

  async assess(candidate: CandidateSignal): Promise<ScamAssessment> {
    const { pair, progress } = candidate;
    const liquidityUsd = pair.liquidity?.usd ?? 0;
    const buys5m = pair.txns?.m5?.buys ?? 0;
    const sells5m = pair.txns?.m5?.sells ?? 0;
    const volume5m = pair.volume?.m5 ?? 0;
    const priceChange5m = pair.priceChange?.m5 ?? 0;
    const marketCap = pair.marketCap ?? pair.fdv ?? 0;
    const pairAgeMinutes = pair.pairCreatedAt
      ? Math.max(0, Math.floor((Date.now() - pair.pairCreatedAt) / 60000))
      : undefined;
    const activeBoosts = pair.boosts?.active ?? 0;
    const hasWebsite = Boolean(pair.info?.websites?.some((site) => site.url));
    const hasSocial = Boolean(pair.info?.socials?.some((social) => social.url));
    const buySellRatio = buys5m / Math.max(sells5m, 1);
    const solanaRisk =
      pair.chainId === 'solana'
        ? await this.solanaRiskService.getRiskSnapshot(pair.baseToken.address)
        : undefined;

    const checks: ScamRiskCheck[] = [
      {
        key: 'progress-window',
        passed: progress >= this.config.minProgress && progress <= this.config.maxProgress,
        weight: 14,
        detail: `progress=${progress}`,
      },
      {
        key: 'liquidity-floor',
        passed: liquidityUsd >= this.config.minLiquidityUsd,
        weight: 18,
        detail: `liquidityUsd=${liquidityUsd}`,
      },
      {
        key: 'buy-pressure',
        passed:
          buys5m >= this.config.min5mBuys &&
          sells5m >= this.config.min5mSells &&
          buySellRatio >= 1.8,
        weight: 18,
        detail: `buys5m=${buys5m}, sells5m=${sells5m}, ratio=${buySellRatio.toFixed(2)}`,
      },
      {
        key: 'volume-floor',
        passed: volume5m >= this.config.min5mVolumeUsd,
        weight: 14,
        detail: `volume5m=${volume5m}`,
      },
      {
        key: 'price-stability',
        passed: priceChange5m >= -this.config.max5mPriceDropPct,
        weight: 10,
        detail: `priceChange5m=${priceChange5m}`,
      },
      {
        key: 'project-surface',
        passed: hasWebsite || hasSocial,
        weight: 8,
        detail: `website=${hasWebsite}, social=${hasSocial}`,
      },
      {
        key: 'market-cap-sanity',
        passed: marketCap >= 8000 && marketCap <= 2500000,
        weight: 10,
        detail: `marketCap=${marketCap}`,
      },
      {
        key: 'pair-age',
        passed: pairAgeMinutes === undefined || pairAgeMinutes >= 2,
        weight: 4,
        detail: `pairAgeMinutes=${pairAgeMinutes ?? 'unknown'}`,
      },
      {
        key: 'boost-anomaly',
        passed: activeBoosts <= 80,
        weight: 4,
        detail: `activeBoosts=${activeBoosts}`,
      },
    ];

    if (pair.chainId === 'solana') {
      checks.push(
        {
          key: 'solana-authorities',
          passed: this.config.solanaRequireRenouncedAuthorities
            ? solanaRisk?.isAvailable === true &&
              solanaRisk.mintAuthorityRenounced === true &&
              solanaRisk.freezeAuthorityRenounced === true
            : true,
          weight: 20,
          detail: `mintAuthorityRenounced=${solanaRisk?.mintAuthorityRenounced ?? 'unknown'}, freezeAuthorityRenounced=${solanaRisk?.freezeAuthorityRenounced ?? 'unknown'}`,
        },
        {
          key: 'solana-top-holder',
          passed:
            solanaRisk?.isAvailable === true &&
            (solanaRisk.topHolderPct ?? Number.POSITIVE_INFINITY) <=
              this.config.solanaMaxTopHolderPct,
          weight: 14,
          detail: `topHolderPct=${solanaRisk?.topHolderPct ?? 'unknown'}`,
        },
        {
          key: 'solana-top5-holder',
          passed:
            solanaRisk?.isAvailable === true &&
            (solanaRisk.top5HolderPct ?? Number.POSITIVE_INFINITY) <=
              this.config.solanaMaxTop5HolderPct,
          weight: 10,
          detail: `top5HolderPct=${solanaRisk?.top5HolderPct ?? 'unknown'}`,
        },
      );
    }

    const failedWeight = checks
      .filter((check) => !check.passed)
      .reduce((sum, check) => sum + check.weight, 0);
    const passCount = checks.filter((check) => check.passed).length;
    const approved =
      failedWeight <= this.config.maxScamScore && passCount >= this.config.minRiskPassCount;

    return {
      score: failedWeight,
      checks,
      approved,
      chainRisk: {
        solana: solanaRisk,
      },
    };
  }
}
