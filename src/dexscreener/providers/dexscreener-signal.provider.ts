import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';
import { DexSignalProvider } from './dex-signal-provider.interface';
import { DexscreenerPair } from '../dexscreener.types';
import { DexscreenerService } from '../dexscreener.service';

@Injectable()
export class DexscreenerSignalProvider implements DexSignalProvider {
  private readonly config: AppConfig;

  constructor(
    private readonly dexscreenerService: DexscreenerService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  async getFreshPairs(): Promise<DexscreenerPair[]> {
    const latestProfiles = await this.dexscreenerService.getLatestTokenProfiles();
    const profiles = latestProfiles
      .filter((profile) => this.config.chainIds.includes(profile.chainId))
      .slice(0, this.config.latestProfilesLimit);
    const pairBatches = await Promise.all(
      profiles.map((profile) =>
        this.dexscreenerService.getTokenPairs(profile.chainId, profile.tokenAddress),
      ),
    );
    const now = Date.now();
    const unique = new Map<string, DexscreenerPair>();

    for (const batch of pairBatches) {
      for (const pair of batch) {
        unique.set(`${pair.chainId}:${pair.pairAddress}`, pair);
      }
    }

    return Array.from(unique.values())
      .filter((pair) => this.config.chainIds.includes(pair.chainId))
      .filter((pair) => {
        if (!pair.pairCreatedAt) {
          return false;
        }

        const ageMinutes = Math.max(0, Math.floor((now - pair.pairCreatedAt) / 60_000));
        return ageMinutes <= this.config.maxPairAgeMinutes;
      })
      .sort((left, right) => (right.pairCreatedAt ?? 0) - (left.pairCreatedAt ?? 0))
      .slice(0, this.config.latestProfilesLimit);
  }
}
