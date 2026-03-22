import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app.config';
import { SignalPayload } from './signal.types';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly config: AppConfig;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  async sendSignal(payload: SignalPayload): Promise<void> {
    if (!this.config.telegramBotToken || !this.config.telegramChatId) {
      return;
    }

    const url = `https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`;
    const text = this.formatMessage(payload);
    const body = {
      chat_id: this.config.telegramChatId,
      text,
      parse_mode: this.config.telegramParseMode,
      disable_web_page_preview: true,
    };

    try {
      await firstValueFrom(
        this.httpService.post(url, body, {
          timeout: 2500,
        }),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Telegram send failed for ${payload.symbol}: ${reason}`);
    }
  }

  private formatMessage(payload: SignalPayload): string {
    const lines = [
      '<b>BUY SIGNAL</b>',
      '',
      `<b>Token:</b> ${this.escape(payload.symbol)} (${this.escape(payload.name)})`,
      `<b>Chain:</b> ${this.escape(payload.chainId)}`,
      `<b>Progress:</b> ${payload.progress}%`,
      `<b>Momentum:</b> ${payload.momentumScore}`,
      `<b>Scam Score:</b> ${payload.scamScore}`,
      `<b>Liquidity:</b> $${this.formatNumber(payload.metrics.liquidityUsd)}`,
      `<b>Volume 5m:</b> $${this.formatNumber(payload.metrics.volume5mUsd)}`,
      `<b>Buys/Sells 5m:</b> ${payload.metrics.buys5m}/${payload.metrics.sells5m}`,
      `<b>Price Change 5m:</b> ${payload.metrics.priceChange5mPct}%`,
    ];

    if (payload.metrics.topHolderPct !== undefined) {
      lines.push(`<b>Top Holder:</b> ${payload.metrics.topHolderPct}%`);
    }

    if (payload.metrics.top5HolderPct !== undefined) {
      lines.push(`<b>Top 5 Holders:</b> ${payload.metrics.top5HolderPct}%`);
    }

    if (payload.metrics.mintAuthorityRenounced !== undefined) {
      lines.push(
        `<b>Mint Authority Renounced:</b> ${payload.metrics.mintAuthorityRenounced ? 'Yes' : 'No'}`,
      );
    }

    if (payload.metrics.freezeAuthorityRenounced !== undefined) {
      lines.push(
        `<b>Freeze Authority Renounced:</b> ${payload.metrics.freezeAuthorityRenounced ? 'Yes' : 'No'}`,
      );
    }

    if (payload.pairUrl) {
      lines.push('', `<a href="${this.escape(payload.pairUrl)}">Dexscreener</a>`);
    }

    return lines.join('\n');
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value);
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
