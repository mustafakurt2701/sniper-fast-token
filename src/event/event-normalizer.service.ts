import { Injectable } from '@nestjs/common';
import { tokenize } from '../common/text.utils';
import { DetectedEvent } from './dto/detected-event.dto';
import { EventKeywordProfile } from './dto/event-keyword-profile.dto';

const STOP_TERMS = ['breaking', 'live', 'update', 'thread', 'video', 'news'];

@Injectable()
export class EventNormalizerService {
  normalize(event: DetectedEvent): EventKeywordProfile {
    const titleTokens = tokenize(event.title);
    const summaryTokens = tokenize(event.summary);
    const baseKeywords = Array.from(new Set([...event.keywords, ...titleTokens, ...summaryTokens]));
    const entitySet = Array.from(new Set(event.entities.map((item) => item.toLowerCase())));
    const aliasSet = Array.from(
      new Set([
        ...event.aliases.map((item) => item.toLowerCase()),
        ...entitySet,
        ...baseKeywords.filter((token) => token.length >= 4),
      ]),
    );
    const hashtagSet = Array.from(
      new Set(event.hashtags.map((item) => item.replace(/^#/, '').toLowerCase())),
    );
    const tickerLikeTerms = Array.from(
      new Set(
        [...titleTokens, ...event.aliases]
          .map((term) => term.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
          .filter((term) => term.length >= 3 && term.length <= 10),
      ),
    );
    const memeTerms = Array.from(
      new Set(
        [...baseKeywords, ...event.aliases]
          .filter((term) => term.length >= 4)
          .map((term) => term.toLowerCase()),
      ),
    );

    return {
      eventId: event.eventId,
      canonicalTitle: event.title,
      shortLabel: titleTokens.slice(0, 3).join(' ').toUpperCase(),
      keywordSet: baseKeywords.map((term) => term.toLowerCase()),
      aliasSet,
      hashtagSet,
      entitySet,
      tickerLikeTerms,
      memeTerms,
      stopTerms: STOP_TERMS,
      negativeTerms: ['airdrop', 'presale', 'call channel', '100x', 'shill'],
    };
  }
}
