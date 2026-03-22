import { DexscreenerPair } from '../dexscreener.types';

export interface DexSignalProvider {
  getFreshPairs(): Promise<DexscreenerPair[]>;
}

export const DEX_SIGNAL_PROVIDER = 'DEX_SIGNAL_PROVIDER';
