import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app.config';
import { DexscreenerPair, DexscreenerSearchResponse } from './dexscreener.types';

@Injectable()
export class DexscreenerService {
  private readonly logger = new Logger(DexscreenerService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.getOrThrow<AppConfig>('app').dexscreenerBaseUrl;
  }

  async searchPairs(query: string): Promise<DexscreenerPair[]> {
    const url = `${this.baseUrl}/latest/dex/search`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<DexscreenerSearchResponse>(url, {
          params: { q: query },
          timeout: 2500,
        }),
      );

      return response.data.pairs ?? [];
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Dexscreener search failed for "${query}": ${reason}`);
      return [];
    }
  }
}
