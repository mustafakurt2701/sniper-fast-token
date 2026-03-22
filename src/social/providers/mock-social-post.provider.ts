import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';
import { SocialPost, SocialPostProvider } from './social-post-provider.interface';

@Injectable()
export class MockSocialPostProvider implements SocialPostProvider {
  private readonly config: AppConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  async getRecentPosts(): Promise<SocialPost[]> {
    if (!this.config.enableMockSocialPosts) {
      return [];
    }

    const now = Date.now();

    return [
      {
        id: 'post-blackout-1',
        source: 'mock-x',
        authorId: 'a1',
        authorHandle: 'flashwire',
        text: 'Breaking: major power outage hits Spain and Portugal, airports delayed and trains halted. #SpainBlackout #Portugal',
        hashtags: ['SpainBlackout', 'Portugal'],
        urls: ['https://news.example/power-outage-spain-portugal'],
        mentionedTickers: [],
        contractAddresses: [],
        createdAt: new Date(now - 45_000),
        engagementScore: 88,
      },
      {
        id: 'post-blackout-2',
        source: 'mock-x',
        authorId: 'a2',
        authorHandle: 'euroalerts',
        text: 'Spain blackout trending across X. Portugal grid failure being investigated. Meme accounts already posting BLACKOUT and GRID jokes.',
        hashtags: ['SpainBlackout', 'GridFailure'],
        urls: [],
        mentionedTickers: ['BLACKOUT'],
        contractAddresses: [],
        createdAt: new Date(now - 35_000),
        engagementScore: 61,
      },
      {
        id: 'post-diplomacy-1',
        source: 'mock-x',
        authorId: 'b1',
        authorHandle: 'worldbrief',
        text: 'Emergency summit after border strike in the Red Sea corridor. Diplomats from Egypt and Saudi Arabia rush into talks.',
        hashtags: ['RedSea', 'BreakingNews'],
        urls: ['https://news.example/red-sea-summit'],
        mentionedTickers: [],
        contractAddresses: [],
        createdAt: new Date(now - 110_000),
        engagementScore: 54,
      },
      {
        id: 'post-celeb-1',
        source: 'mock-x',
        authorId: 'c1',
        authorHandle: 'viralfeed',
        text: 'Viral clip of actor Orion Vale yelling "we are offline" hits 4M views in an hour. Meme edits everywhere.',
        hashtags: ['OrionVale', 'WeAreOffline'],
        urls: ['https://video.example/orion-viral'],
        mentionedTickers: [],
        contractAddresses: [],
        createdAt: new Date(now - 70_000),
        engagementScore: 73,
      },
    ];
  }
}
