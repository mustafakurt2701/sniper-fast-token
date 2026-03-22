import { Injectable } from '@nestjs/common';
import { clamp, jaccardSimilarity, normalizedSimilarity, tokenize } from '../common/text.utils';
import { DexscreenerPair } from '../dexscreener/dexscreener.types';
import { SocialPost } from '../social/providers/social-post-provider.interface';
import { TokenMetadata } from '../token/token-enrichment.service';
import { EventKeywordProfile } from './dto/event-keyword-profile.dto';
import { EventTokenMatch } from './dto/event-token-match.dto';

@Injectable()
export class NarrativeMatchingService {
  match(
    profile: EventKeywordProfile,
    pair: DexscreenerPair,
    metadata: TokenMetadata,
    posts: SocialPost[],
  ): EventTokenMatch {
    const searchableText = [
      pair.baseToken.name,
      pair.baseToken.symbol,
      pair.url ?? '',
      metadata.description ?? '',
      metadata.websiteText ?? '',
      ...metadata.socialTexts,
    ]
      .join(' ')
      .toLowerCase();
    const searchableTokens = tokenize(searchableText);
    const exactMatches = profile.keywordSet.filter((keyword) =>
      searchableText.includes(keyword.toLowerCase()),
    );
    const aliasMatches = profile.aliasSet.filter((alias) => searchableText.includes(alias));
    const tickerMatches = profile.tickerLikeTerms.filter((term) =>
      [pair.baseToken.symbol, pair.baseToken.name].some((value) =>
        value.toUpperCase().includes(term),
      ),
    );
    const fuzzyMatches = profile.keywordSet.filter((keyword) =>
      searchableTokens.some((token) => normalizedSimilarity(token, keyword) >= 0.82),
    );
    const semanticScore =
      jaccardSimilarity(searchableTokens, [...profile.keywordSet, ...profile.aliasSet]) * 100;
    const relatedPosts = posts.filter((post) => {
      const text = post.text.toLowerCase();
      return (
        exactMatches.some((match) => text.includes(match)) ||
        aliasMatches.some((match) => text.includes(match)) ||
        tickerMatches.some((match) => text.includes(match.toLowerCase())) ||
        post.contractAddresses.includes(pair.baseToken.address)
      );
    });
    const socialOverlapScore = clamp(relatedPosts.length * 18 + new Set(relatedPosts.map((post) => post.authorId)).size * 10);
    const metadataOverlapScore = clamp(
      exactMatches.length * 22 + aliasMatches.length * 14 + fuzzyMatches.length * 8,
    );
    const nameSymbolScore = clamp(
      exactMatches.length * 25 + aliasMatches.length * 18 + tickerMatches.length * 16,
    );
    const pairAgeMinutes = pair.pairCreatedAt
      ? Math.max(0, Math.floor((Date.now() - pair.pairCreatedAt) / 60_000))
      : 999;
    const freshnessScore =
      pairAgeMinutes <= 5 ? 100 : pairAgeMinutes <= 15 ? 82 : pairAgeMinutes <= 30 ? 60 : 25;
    const matchScore = clamp(
      nameSymbolScore * 0.45 +
        metadataOverlapScore * 0.2 +
        socialOverlapScore * 0.2 +
        semanticScore * 0.15,
    );

    return {
      eventId: profile.eventId,
      contractAddress: pair.baseToken.address,
      tokenName: pair.baseToken.name,
      tokenSymbol: pair.baseToken.symbol,
      pairAddress: pair.pairAddress,
      matchScore,
      exactMatches: Array.from(new Set([...exactMatches, ...aliasMatches, ...tickerMatches])),
      fuzzyMatches,
      semanticMatches: semanticScore >= 25 ? profile.keywordSet.slice(0, 3) : [],
      socialOverlapScore,
      metadataOverlapScore,
      nameSymbolScore,
      freshnessScore,
      confidence: Number((matchScore / 100).toFixed(2)),
      reasonCodes: [
        ...(exactMatches.length ? ['EVENT_KEYWORD_OVERLAP'] : []),
        ...(aliasMatches.length ? ['ALIAS_MATCH'] : []),
        ...(tickerMatches.length ? ['TICKER_LIKE_MATCH'] : []),
        ...(relatedPosts.length ? ['EVENT_SOCIAL_COOCCURRENCE'] : []),
        ...(pairAgeMinutes <= 5 ? ['FRESH_LAUNCH'] : []),
      ],
    };
  }
}
