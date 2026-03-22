import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EventClusteringService } from './event-clustering.service';
import { EventDetectionRulesService } from './event-detection-rules.service';
import { EventExtractionService } from './event-extraction.service';
import { EventNormalizerService } from './event-normalizer.service';
import { EventService } from './event.service';
import { NarrativeMatchingService } from './narrative-matching.service';
import { ActiveEventStateService } from './active-event-state.service';
import { EVENT_SIGNAL_PROVIDERS } from './providers/event-signal-provider.interface';
import { MockEventProvider } from './providers/mock-event.provider';
import { TwitterEventProvider } from './providers/twitter-event.provider';
import { SocialPostService } from '../social/social-post.service';
import { SOCIAL_POST_PROVIDERS } from '../social/providers/social-post-provider.interface';
import { MockSocialPostProvider } from '../social/providers/mock-social-post.provider';
import { EventTokenScoringService } from './event-token-scoring.service';

@Module({
  imports: [HttpModule],
  providers: [
    EventService,
    EventClusteringService,
    EventDetectionRulesService,
    EventExtractionService,
    EventNormalizerService,
    NarrativeMatchingService,
    ActiveEventStateService,
    EventTokenScoringService,
    SocialPostService,
    MockSocialPostProvider,
    TwitterEventProvider,
    MockEventProvider,
    {
      provide: SOCIAL_POST_PROVIDERS,
      useFactory: (mockSocialPostProvider: MockSocialPostProvider) => [mockSocialPostProvider],
      inject: [MockSocialPostProvider],
    },
    {
      provide: EVENT_SIGNAL_PROVIDERS,
      useFactory: (twitterEventProvider: TwitterEventProvider, mockEventProvider: MockEventProvider) => [
        twitterEventProvider,
        mockEventProvider,
      ],
      inject: [TwitterEventProvider, MockEventProvider],
    },
  ],
  exports: [EventService, NarrativeMatchingService, EventTokenScoringService, SocialPostService],
})
export class EventModule {}
