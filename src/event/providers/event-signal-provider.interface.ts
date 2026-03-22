import { DetectedEvent } from '../dto/detected-event.dto';

export interface EventSignalProvider {
  getSignals(): Promise<DetectedEvent[]>;
}

export const EVENT_SIGNAL_PROVIDERS = 'EVENT_SIGNAL_PROVIDERS';
