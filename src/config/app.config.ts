export interface AppConfig {
  port: number;
  dexscreenerBaseUrl: string;
  scanIntervalMs: number;
  minProgress: number;
  maxProgress: number;
  minLiquidityUsd: number;
  min5mBuys: number;
  min5mSells: number;
  min5mVolumeUsd: number;
  max5mPriceDropPct: number;
  maxScamScore: number;
  minRiskPassCount: number;
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

export const appConfig = (): { app: AppConfig } => ({
  app: {
    port: readNumber('PORT', 3000),
    dexscreenerBaseUrl: process.env.DEXSCREENER_BASE_URL ?? 'https://api.dexscreener.com',
    scanIntervalMs: readNumber('SCAN_INTERVAL_MS', 3000),
    minProgress: readNumber('MIN_PROGRESS', 42),
    maxProgress: readNumber('MAX_PROGRESS', 93),
    minLiquidityUsd: readNumber('MIN_LIQUIDITY_USD', 18000),
    min5mBuys: readNumber('MIN_5M_BUYS', 24),
    min5mSells: readNumber('MIN_5M_SELLS', 0),
    min5mVolumeUsd: readNumber('MIN_5M_VOLUME_USD', 12000),
    max5mPriceDropPct: readNumber('MAX_5M_PRICE_DROP_PCT', 15),
    maxScamScore: readNumber('MAX_SCAM_SCORE', 45),
    minRiskPassCount: readNumber('MIN_RISK_PASS_COUNT', 5),
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
});
