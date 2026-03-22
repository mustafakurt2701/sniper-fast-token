import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { EventNormalizerService } from '../event/event-normalizer.service';
import { NarrativeMatchingService } from '../event/narrative-matching.service';
import { EventTokenScoringService } from '../event/event-token-scoring.service';
import { DetectedEvent } from '../event/dto/detected-event.dto';
import { DexscreenerPair } from '../dexscreener/dexscreener.types';
import { TokenMetadata } from '../token/token-enrichment.service';

const appConfig = {
  minLiquidityUsd: 15_000,
  minVolume1mUsd: 3_000,
  min5mVolumeUsd: 1_500,
  maxPairAgeMinutes: 30,
  earlyPairAgeMinutes: 5,
  eventMatchWeight: 0.4,
  dexScoreWeight: 0.3,
  tokenSocialWeight: 0.2,
  freshnessScoreWeight: 0.1,
  minEventMatchScore: 55,
  minTokenSocialScore: 35,
  minBreakingEventTokenScore: 78,
  minEarlyEventMatchScore: 68,
  minConfirmedEventNarrativeScore: 60,
  minEventMentionVelocity1m: 10,
};

test('event normalizer emits ticker-like aliases for hot event', () => {
  const service = new EventNormalizerService();
  const event: DetectedEvent = {
    eventId: 'event-1',
    title: 'Major power outage hits Spain and Portugal',
    summary: 'Widespread blackout across Iberia causes disruption.',
    category: 'infrastructure',
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    source: 'test',
    rawMentionsCount: 20,
    uniqueAuthors: 10,
    velocity1m: 12,
    velocity5m: 35,
    keywords: ['power outage', 'blackout'],
    hashtags: ['SpainBlackout'],
    entities: ['Spain', 'Portugal'],
    aliases: ['iberia blackout'],
    confidence: 0.8,
  };

  const profile = service.normalize(event);

  assert.equal(profile.eventId, 'event-1');
  assert.ok(profile.keywordSet.includes('power outage'));
  assert.ok(profile.aliasSet.includes('iberia blackout'));
  assert.ok(profile.tickerLikeTerms.includes('SPAIN'));
});

test('narrative matching scores event-linked token above weak token', () => {
  const normalizer = new EventNormalizerService();
  const matcher = new NarrativeMatchingService();
  const event: DetectedEvent = {
    eventId: 'event-1',
    title: 'Major power outage hits Spain and Portugal',
    summary: 'Widespread blackout across Iberia causes disruption.',
    category: 'infrastructure',
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    source: 'test',
    rawMentionsCount: 20,
    uniqueAuthors: 10,
    velocity1m: 12,
    velocity5m: 35,
    keywords: ['power outage', 'blackout'],
    hashtags: ['SpainBlackout'],
    entities: ['Spain', 'Portugal'],
    aliases: ['iberia blackout'],
    confidence: 0.8,
  };
  const profile = normalizer.normalize(event);
  const pair: DexscreenerPair = {
    chainId: 'solana',
    dexId: 'raydium',
    pairAddress: 'pair-1',
    pairCreatedAt: Date.now() - 2 * 60_000,
    baseToken: {
      address: 'token-1',
      name: 'Spain Blackout',
      symbol: 'BLACKOUT',
    },
    quoteToken: {
      address: 'sol',
      name: 'Wrapped SOL',
      symbol: 'SOL',
    },
    liquidity: { usd: 20000 },
    volume: { m5: 22000 },
    txns: { m5: { buys: 22, sells: 4 } },
    priceChange: { m5: 18 },
  };
  const metadata: TokenMetadata = {
    description: 'Memecoin reacting to the Spain blackout narrative.',
    websiteText: 'Spain blackout and Iberia grid failure memes.',
    socialTexts: ['Spain blackout on Solana'],
  };
  const posts = [
    {
      id: '1',
      source: 'x',
      authorId: 'author-1',
      authorHandle: 'headlinebot',
      text: 'Spain blackout memes are now spawning BLACKOUT tokens.',
      hashtags: ['SpainBlackout'],
      urls: [],
      mentionedTickers: ['BLACKOUT'],
      contractAddresses: ['token-1'],
      createdAt: new Date(),
      engagementScore: 55,
    },
  ];

  const match = matcher.match(profile, pair, metadata, posts);

  assert.ok(match.matchScore >= 70);
  assert.ok(match.reasonCodes.includes('EVENT_KEYWORD_OVERLAP'));
  assert.ok(match.reasonCodes.includes('FRESH_LAUNCH'));
});

test('event token scoring rejects low-liquidity weak narrative pair', () => {
  const scoring = new EventTokenScoringService(
    new ConfigService({
      app: appConfig,
    }),
  );
  const pair: DexscreenerPair = {
    chainId: 'solana',
    dexId: 'raydium',
    pairAddress: 'pair-2',
    pairCreatedAt: Date.now() - 20 * 60_000,
    baseToken: {
      address: 'token-2',
      name: 'Random Cat',
      symbol: 'CAT',
    },
    quoteToken: {
      address: 'sol',
      name: 'Wrapped SOL',
      symbol: 'SOL',
    },
    liquidity: { usd: 2500 },
    volume: { m5: 3000 },
    txns: { m5: { buys: 2, sells: 8 } },
    priceChange: { m5: -12 },
  };

  const result = scoring.score(
    pair,
    undefined,
    undefined,
    {
      socialTexts: [],
    },
  );

  assert.equal(result.signalType, 'REJECTED_LOW_LIQUIDITY');
  assert.ok(result.riskNotes.includes('low liquidity'));
});
