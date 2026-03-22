import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app.config';
import {
  DexscreenerPair,
  DexscreenerSearchResponse,
  DexscreenerTokenProfile,
} from './dexscreener.types';

@Injectable()
export class DexscreenerService {
  private readonly logger = new Logger(DexscreenerService.name);
  private readonly config: AppConfig;
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  async searchPairs(query: string): Promise<DexscreenerPair[]> {
    const url = `${this.config.dexscreenerBaseUrl}/latest/dex/search`;
    const response = await this.getWithCache<DexscreenerSearchResponse>(`search:${query}`, url, {
      params: { q: query },
    });
    return response?.pairs ?? [];
  }

  async getLatestTokenProfiles(): Promise<DexscreenerTokenProfile[]> {
    const url = `${this.config.dexscreenerBaseUrl}/token-profiles/latest/v1`;
    return (await this.getWithCache<DexscreenerTokenProfile[]>('latest-token-profiles', url)) ?? [];
  }

  async getTokenPairs(chainId: string, tokenAddress: string): Promise<DexscreenerPair[]> {
    const url = `${this.config.dexscreenerBaseUrl}/token-pairs/v1/${chainId}/${tokenAddress}`;
    return (
      (await this.getWithCache<DexscreenerPair[]>(`token-pairs:${chainId}:${tokenAddress}`, url)) ??
      []
    );
  }

  private async getWithCache<T>(
    cacheKey: string,
    url: string,
    options?: { params?: Record<string, string> },
  ): Promise<T | undefined> {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const value = await this.fetchWithRetry<T>(url, options);
    if (value !== undefined) {
      this.cache.set(cacheKey, {
        expiresAt: Date.now() + this.config.providerCacheTtlMs,
        value,
      });
    }

    return value;
  }

  private async fetchWithRetry<T>(
    url: string,
    options?: { params?: Record<string, string> },
  ): Promise<T | undefined> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await firstValueFrom(
          this.httpService.get<T>(url, {
            params: options?.params,
            timeout: this.config.providerTimeoutMs,
          }),
        );
        return response.data;
      } catch (error) {
        const status =
          error instanceof AxiosError ? error.response?.status : undefined;
        const reason = error instanceof Error ? error.message : 'unknown error';
        if (status === 429 && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          continue;
        }

        this.logger.warn(`Dexscreener request failed for ${url}: ${reason}`);
        return undefined;
      }
    }

    return undefined;
  }
}
