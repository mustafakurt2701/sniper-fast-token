import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { EventExtractionService } from './event-extraction.service';
import { ActiveEventState, ActiveEventStateService } from './active-event-state.service';
import { EventNormalizerService } from './event-normalizer.service';
import { EVENT_SIGNAL_PROVIDERS, EventSignalProvider } from './providers/event-signal-provider.interface';

@Injectable()
export class EventService implements OnModuleInit {
  private readonly logger = new Logger(EventService.name);
  private readonly config: AppConfig;
  private refreshTimer?: NodeJS.Timeout;
  private refreshing = false;

  constructor(
    @Inject(EVENT_SIGNAL_PROVIDERS) private readonly signalProviders: EventSignalProvider[],
    private readonly eventExtractionService: EventExtractionService,
    private readonly eventNormalizerService: EventNormalizerService,
    private readonly activeEventStateService: ActiveEventStateService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  onModuleInit(): void {
    if (!this.config.enableEventDrivenDiscovery) {
      return;
    }

    this.refreshTimer = setInterval(() => {
      void this.refreshActiveEvents();
    }, this.config.eventRefreshIntervalSeconds * 1000);
    void this.refreshActiveEvents();
  }

  async refreshActiveEvents(): Promise<ActiveEventState[]> {
    if (this.refreshing) {
      return this.activeEventStateService.listActive();
    }

    this.refreshing = true;
    try {
      const providerEvents = await Promise.allSettled(
        this.signalProviders.map((provider) => provider.getSignals()),
      );
      const directEvents = providerEvents.flatMap((batch) =>
        batch.status === 'fulfilled' ? batch.value : [],
      );
      const extractedEvents = await this.eventExtractionService.detectEvents();

      for (const event of [...directEvents, ...extractedEvents]) {
        const profile = this.eventNormalizerService.normalize(event);
        this.activeEventStateService.upsert(event, profile);
      }

      return this.activeEventStateService.listActive();
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Event refresh failed: ${reason}`);
      return this.activeEventStateService.listActive();
    } finally {
      this.refreshing = false;
    }
  }

  async getActiveEvents(): Promise<ActiveEventState[]> {
    const active = this.activeEventStateService.listActive();
    if (active.length > 0) {
      return active;
    }

    return this.refreshActiveEvents();
  }
}
