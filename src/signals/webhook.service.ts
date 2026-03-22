import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app.config';
import { SignalPayload } from './signal.types';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly config: AppConfig;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  async dispatch(payload: SignalPayload): Promise<void> {
    if (this.config.webhookUrls.length === 0) {
      this.logger.warn(`Signal ready for ${payload.symbol}, but no WEBHOOK_URLS configured`);
      return;
    }

    await Promise.allSettled(
      this.config.webhookUrls.map(async (url) => {
        await firstValueFrom(
          this.httpService.post(url, payload, {
            timeout: this.config.webhookTimeoutMs,
          }),
        );
      }),
    );
  }
}
