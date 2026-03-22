import { Injectable } from '@nestjs/common';
import { DetectedEvent } from '../dto/detected-event.dto';
import { EventSignalProvider } from './event-signal-provider.interface';

@Injectable()
export class MockEventProvider implements EventSignalProvider {
  async getSignals(): Promise<DetectedEvent[]> {
    const now = Date.now();
    return [
      {
        eventId: 'mock-power-outage-spain-portugal',
        title: 'Major power outage hits Spain and Portugal',
        summary: 'Widespread power outage triggers travel disruption and meme activity.',
        category: 'infrastructure',
        firstSeenAt: new Date(now - 4 * 60_000),
        lastSeenAt: new Date(now - 30_000),
        source: 'mock-event-provider',
        rawMentionsCount: 42,
        uniqueAuthors: 17,
        velocity1m: 18,
        velocity5m: 44,
        keywords: ['power outage', 'spain', 'portugal', 'grid failure', 'blackout'],
        hashtags: ['SpainBlackout', 'GridFailure'],
        entities: ['Spain', 'Portugal'],
        aliases: ['iberia blackout', 'spain blackout', 'portugal outage'],
        sentiment: 'negative',
        geoContext: ['Spain', 'Portugal'],
        confidence: 0.82,
      },
    ];
  }
}
