import type { DexscreenerPair } from '../dexscreener/dexscreener.types';
import type { SolanaRiskSnapshot } from './solana-risk.service';

export interface CandidateSignal {
  pair: DexscreenerPair;
  progress: number;
  momentumScore: number;
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
  metrics: {
    liquidityUsd: number;
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
