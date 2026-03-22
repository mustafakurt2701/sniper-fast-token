import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app.config';
import { DexscreenerPair } from '../dexscreener/dexscreener.types';

export interface TokenMetadata {
  description?: string;
  websiteUrl?: string;
  websiteText?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  imageUrl?: string;
  socialTexts: string[];
}

@Injectable()
export class TokenEnrichmentService {
  private readonly logger = new Logger(TokenEnrichmentService.name);
  private readonly config: AppConfig;
  private readonly cache = new Map<string, { expiresAt: number; value: TokenMetadata }>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  async enrich(pair: DexscreenerPair): Promise<TokenMetadata> {
    const cacheKey = `${pair.chainId}:${pair.baseToken.address}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const websiteUrl = pair.info?.websites?.[0]?.url;
    const metadata: TokenMetadata = {
      description: pair.info?.header ?? pair.info?.websites?.[0]?.label,
      websiteUrl,
      websiteText: websiteUrl ? await this.fetchWebsiteText(websiteUrl) : undefined,
      twitterUrl: pair.info?.socials?.find((item) => item.type === 'twitter')?.url,
      telegramUrl: pair.info?.socials?.find((item) => item.type === 'telegram')?.url,
      imageUrl: pair.info?.imageUrl,
      socialTexts: [
        pair.baseToken.name,
        pair.baseToken.symbol,
        ...(pair.info?.socials?.map((item) => item.url ?? '').filter(Boolean) ?? []),
      ],
    };

    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.config.providerCacheTtlMs,
      value: metadata,
    });
    return metadata;
  }

  private async fetchWebsiteText(url: string): Promise<string | undefined> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(url, {
          timeout: this.config.providerTimeoutMs,
          responseType: 'text' as never,
        }),
      );

      return response.data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Token metadata fetch failed for ${url}: ${reason}`);
      return undefined;
    }
  }
}
