export interface SocialPost {
  id: string;
  source: string;
  authorId: string;
  authorHandle: string;
  text: string;
  hashtags: string[];
  urls: string[];
  mentionedTickers: string[];
  contractAddresses: string[];
  lang?: string;
  createdAt: Date;
  engagementScore: number;
}

export interface SocialPostProvider {
  getRecentPosts(): Promise<SocialPost[]>;
}

export const SOCIAL_POST_PROVIDERS = 'SOCIAL_POST_PROVIDERS';
