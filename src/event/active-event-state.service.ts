import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { DetectedEvent } from './dto/detected-event.dto';
import { EventKeywordProfile } from './dto/event-keyword-profile.dto';

export type ActiveEventStatus = 'EMERGING' | 'HOT' | 'COOLING' | 'EXPIRED';

export interface ActiveEventState {
  eventId: string;
  firstSeenAt: Date;
  peakSeenAt: Date;
  lastSeenAt: Date;
  currentVelocity: number;
  status: ActiveEventStatus;
  event: DetectedEvent;
  profile: EventKeywordProfile;
}

@Injectable()
export class ActiveEventStateService {
  private readonly config: AppConfig;
  private readonly activeEvents = new Map<string, ActiveEventState>();

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  upsert(event: DetectedEvent, profile: EventKeywordProfile): void {
    const existing = this.activeEvents.get(event.eventId);
    const currentVelocity = Math.max(event.velocity1m, event.velocity5m / 5);

    this.activeEvents.set(event.eventId, {
      eventId: event.eventId,
      firstSeenAt: existing?.firstSeenAt ?? event.firstSeenAt,
      peakSeenAt:
        existing && existing.currentVelocity >= currentVelocity ? existing.peakSeenAt : event.lastSeenAt,
      lastSeenAt: event.lastSeenAt,
      currentVelocity,
      status: this.resolveStatus(event, currentVelocity),
      event,
      profile,
    });
    this.prune();
  }

  listActive(): ActiveEventState[] {
    this.prune();
    return Array.from(this.activeEvents.values())
      .filter((item) => item.status !== 'EXPIRED')
      .sort((left, right) => right.currentVelocity - left.currentVelocity)
      .slice(0, this.config.maxActiveEvents);
  }

  private resolveStatus(event: DetectedEvent, currentVelocity: number): ActiveEventStatus {
    const ageMinutes = (Date.now() - event.firstSeenAt.getTime()) / 60_000;
    if (ageMinutes > this.config.activeEventWindowMinutes) {
      return 'EXPIRED';
    }

    if (currentVelocity >= this.config.minEventMentionVelocity1m) {
      return 'HOT';
    }

    if (ageMinutes <= this.config.hotEventLookbackMinutes) {
      return 'EMERGING';
    }

    return 'COOLING';
  }

  private prune(): void {
    const ttlMs = this.config.activeEventWindowMinutes * 60_000;
    for (const [eventId, value] of this.activeEvents.entries()) {
      if (Date.now() - value.lastSeenAt.getTime() > ttlMs) {
        this.activeEvents.delete(eventId);
      }
    }
  }
}
