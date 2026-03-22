import { Injectable } from '@nestjs/common';
import { DetectedEvent } from '../dto/detected-event.dto';
import { EventSignalProvider } from './event-signal-provider.interface';

@Injectable()
export class TwitterEventProvider implements EventSignalProvider {
  async getSignals(): Promise<DetectedEvent[]> {
    return [];
  }
}
