import type { DexscreenerPair } from '../dexscreener/dexscreener.types';
import type { DetectedEvent } from '../event/dto/detected-event.dto';
import type { EventTokenMatch } from '../event/dto/event-token-match.dto';
import type { TokenMetadata } from '../token/token-enrichment.service';
import type { SolanaRiskSnapshot } from './solana-risk.service';

export type SignalType =
  | 'BREAKING_EVENT_TOKEN'
  | 'EARLY_EVENT_MATCH'
  | 'CONFIRMED_EVENT_NARRATIVE'
  | 'WEAK_EVENT_ASSOCIATION'
  | 'REJECTED_NO_EVENT_MATCH'
  | 'REJECTED_LOW_LIQUIDITY'
  | 'REJECTED_SOCIAL_SPAM';

export interface CandidateSignal {
  pair: DexscreenerPair;
  progress: number;
  momentumScore: number;
  metadata?: TokenMetadata;
  matchedEvent?: DetectedEvent;
  eventMatch?: EventTokenMatch;
}

export interface ScamRiskCheck {
  key: string;
  passed: boolean;
  weight: number;
  detail: string;
}

export interface ScamAssessment {
  score: number;
  checks: ScamRiskCheck[];
  approved: boolean;
  chainRisk?: {
    solana?: SolanaRiskSnapshot;
  };
}

export interface SignalPayload {
  type: 'progress_signal';
  signalType: SignalType;
  chainId: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  pairAddress: string;
  pairUrl?: string;
  progress: number;
  momentumScore: number;
  scamScore: number;
  checks: ScamRiskCheck[];
  matchedEvent?: {
    eventId: string;
    title: string;
    category: string;
    source: string;
    confidence: number;
  };
  eventCategory?: string;
  eventMatchScore: number;
  tokenSocialScore: number;
  dexScore: number;
  freshnessScore: number;
  finalScore: number;
  reasonCodes: string[];
  riskNotes: string[];
  eventTokenMatch?: EventTokenMatch;
  metrics: {
    liquidityUsd: number;
    volume1mUsd: number;
    volume5mUsd: number;
    buys5m: number;
    sells5m: number;
    priceChange5mPct: number;
    marketCap?: number;
    fdv?: number;
    activeBoosts: number;
    pairAgeMinutes?: number;
    topHolderPct?: number;
    top5HolderPct?: number;
    mintAuthorityRenounced?: boolean;
    freezeAuthorityRenounced?: boolean;
  };
  discoveredAt: string;
}
