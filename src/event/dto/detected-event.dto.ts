export interface DetectedEvent {
  eventId: string;
  title: string;
  summary: string;
  category: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  source: string;
  rawMentionsCount: number;
  uniqueAuthors: number;
  velocity1m: number;
  velocity5m: number;
  keywords: string[];
  hashtags: string[];
  entities: string[];
  aliases: string[];
  sentiment?: string;
  geoContext?: string[];
  confidence: number;
}
