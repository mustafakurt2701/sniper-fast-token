export interface EventKeywordProfile {
  eventId: string;
  canonicalTitle: string;
  shortLabel: string;
  keywordSet: string[];
  aliasSet: string[];
  hashtagSet: string[];
  entitySet: string[];
  tickerLikeTerms: string[];
  memeTerms: string[];
  stopTerms: string[];
  negativeTerms: string[];
}
