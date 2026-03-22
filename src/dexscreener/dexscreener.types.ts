export interface DexscreenerSearchResponse {
  schemaVersion?: string;
  pairs?: DexscreenerPair[];
}

export interface DexscreenerPair {
  chainId: string;
  dexId: string;
  url?: string;
  pairAddress: string;
  labels?: string[];
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd?: string;
  txns?: Record<string, { buys?: number; sells?: number }>;
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  boosts?: {
    active?: number;
  };
  info?: {
    imageUrl?: string;
    websites?: Array<{ label?: string; url?: string }>;
    socials?: Array<{ type?: string; url?: string }>;
  };
}
