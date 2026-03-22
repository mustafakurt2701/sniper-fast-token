export interface EventTokenMatch {
  eventId: string;
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  pairAddress?: string;
  matchScore: number;
  exactMatches: string[];
  fuzzyMatches: string[];
  semanticMatches: string[];
  socialOverlapScore: number;
  metadataOverlapScore: number;
  nameSymbolScore: number;
  freshnessScore: number;
  confidence: number;
  reasonCodes: string[];
}
