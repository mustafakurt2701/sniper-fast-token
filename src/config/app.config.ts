export interface AppConfig {
  port: number;
  dexscreenerBaseUrl: string;
  scanIntervalMs: number;
  scanIntervalSeconds: number;
  eventRefreshIntervalSeconds: number;
  activeEventWindowMinutes: number;
  hotEventLookbackMinutes: number;
  minEventMentionVelocity1m: number;
  minEventUniqueAuthors5m: number;
  minEventMatchScore: number;
  minTokenSocialScore: number;
  minBreakingEventTokenScore: number;
  minEarlyEventMatchScore: number;
  minConfirmedEventNarrativeScore: number;
  minProgress: number;
  maxProgress: number;
  minLiquidityUsd: number;
  minVolume1mUsd: number;
  min5mBuys: number;
  min5mSells: number;
  min5mVolumeUsd: number;
  max5mPriceDropPct: number;
  maxPairAgeMinutes: number;
  earlyPairAgeMinutes: number;
  latestProfilesLimit: number;
  maxScamScore: number;
  minRiskPassCount: number;
  eventMatchWeight: number;
  dexScoreWeight: number;
  tokenSocialWeight: number;
  freshnessScoreWeight: number;
  enableEventDrivenDiscovery: boolean;
  enableSemanticMatching: boolean;
  enableMockSocialPosts: boolean;
  maxActiveEvents: number;
  providerTimeoutMs: number;
  providerCacheTtlMs: number;
  webhookUrls: string[];
  webhookTimeoutMs: number;
  chainIds: string[];
  solanaRpcUrl: string;
  solanaMaxTopHolderPct: number;
  solanaMaxTop5HolderPct: number;
  solanaRequireRenouncedAuthorities: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramParseMode: string;
}

const readNumber = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readCsv = (key: string, fallback: string[]): string[] => {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};

export const appConfig = (): { app: AppConfig } => {
  const scanIntervalSeconds = readNumber('SCAN_INTERVAL_SECONDS', 10);

  return {
    app: {
      port: readNumber('PORT', 3000),
      dexscreenerBaseUrl: process.env.DEXSCREENER_BASE_URL ?? 'https://api.dexscreener.com',
      scanIntervalMs: readNumber('SCAN_INTERVAL_MS', scanIntervalSeconds * 1000),
      scanIntervalSeconds,
      eventRefreshIntervalSeconds: readNumber('EVENT_REFRESH_INTERVAL_SECONDS', 15),
      activeEventWindowMinutes: readNumber('ACTIVE_EVENT_WINDOW_MINUTES', 120),
      hotEventLookbackMinutes: readNumber('HOT_EVENT_LOOKBACK_MINUTES', 30),
      minEventMentionVelocity1m: readNumber('MIN_EVENT_MENTION_VELOCITY_1M', 10),
      minEventUniqueAuthors5m: readNumber('MIN_EVENT_UNIQUE_AUTHORS_5M', 5),
      minEventMatchScore: readNumber('MIN_EVENT_MATCH_SCORE', 55),
      minTokenSocialScore: readNumber('MIN_TOKEN_SOCIAL_SCORE', 35),
      minBreakingEventTokenScore: readNumber('MIN_BREAKING_EVENT_TOKEN_SCORE', 78),
      minEarlyEventMatchScore: readNumber('MIN_EARLY_EVENT_MATCH_SCORE', 68),
      minConfirmedEventNarrativeScore: readNumber('MIN_CONFIRMED_EVENT_NARRATIVE_SCORE', 60),
      minProgress: readNumber('MIN_PROGRESS', 15),
      maxProgress: readNumber('MAX_PROGRESS', 100),
      minLiquidityUsd: readNumber('MIN_LIQUIDITY_USD', 15000),
      minVolume1mUsd: readNumber('MIN_VOLUME_1M_USD', 3000),
      min5mBuys: readNumber('MIN_5M_BUYS', 4),
      min5mSells: readNumber('MIN_5M_SELLS', 0),
      min5mVolumeUsd: readNumber('MIN_5M_VOLUME_USD', 1500),
      max5mPriceDropPct: readNumber('MAX_5M_PRICE_DROP_PCT', 35),
      maxPairAgeMinutes: readNumber('MAX_PAIR_AGE_MINUTES', 30),
      earlyPairAgeMinutes: readNumber('EARLY_PAIR_AGE_MINUTES', 5),
      latestProfilesLimit: readNumber('LATEST_PROFILES_LIMIT', 80),
      maxScamScore: readNumber('MAX_SCAM_SCORE', 80),
      minRiskPassCount: readNumber('MIN_RISK_PASS_COUNT', 3),
      eventMatchWeight: readNumber('EVENT_MATCH_WEIGHT', 0.4),
      dexScoreWeight: readNumber('DEX_SCORE_WEIGHT', 0.3),
      tokenSocialWeight: readNumber('TOKEN_SOCIAL_WEIGHT', 0.2),
      freshnessScoreWeight: readNumber('FRESHNESS_SCORE_WEIGHT', 0.1),
      enableEventDrivenDiscovery: readBoolean('ENABLE_EVENT_DRIVEN_DISCOVERY', true),
      enableSemanticMatching: readBoolean('ENABLE_SEMANTIC_MATCHING', false),
      enableMockSocialPosts: readBoolean('ENABLE_MOCK_SOCIAL_POSTS', true),
      maxActiveEvents: readNumber('MAX_ACTIVE_EVENTS', 100),
      providerTimeoutMs: readNumber('PROVIDER_TIMEOUT_MS', 2500),
      providerCacheTtlMs: readNumber('PROVIDER_CACHE_TTL_MS', 15000),
      webhookUrls: readCsv('WEBHOOK_URLS', []),
      webhookTimeoutMs: readNumber('WEBHOOK_TIMEOUT_MS', 2500),
      chainIds: readCsv('CHAIN_IDS', ['solana']),
      solanaRpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
      solanaMaxTopHolderPct: readNumber('SOLANA_MAX_TOP_HOLDER_PCT', 18),
      solanaMaxTop5HolderPct: readNumber('SOLANA_MAX_TOP5_HOLDER_PCT', 45),
      solanaRequireRenouncedAuthorities: readBoolean(
        'SOLANA_REQUIRE_RENOUNCED_AUTHORITIES',
        true,
      ),
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
      telegramChatId: process.env.TELEGRAM_CHAT_ID,
      telegramParseMode: process.env.TELEGRAM_PARSE_MODE ?? 'HTML',
    },
  };
};
