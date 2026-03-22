import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../config/app.config';
import { ConfigService } from '@nestjs/config';
import {
  SocialPost,
  SOCIAL_POST_PROVIDERS,
  SocialPostProvider,
} from './providers/social-post-provider.interface';

@Injectable()
export class SocialPostService {
  private readonly logger = new Logger(SocialPostService.name);
  private readonly config: AppConfig;
  private readonly cache = new Map<string, { expiresAt: number; posts: SocialPost[] }>();

  constructor(
    @Inject(SOCIAL_POST_PROVIDERS) private readonly providers: SocialPostProvider[],
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  async getRecentPosts(): Promise<SocialPost[]> {
    const cacheKey = 'recent-posts';
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.posts;
    }

    const batches = await Promise.allSettled(this.providers.map((provider) => provider.getRecentPosts()));
    const posts: SocialPost[] = [];

    for (const batch of batches) {
      if (batch.status === 'fulfilled') {
        posts.push(...batch.value);
      } else {
        const reason = batch.reason instanceof Error ? batch.reason.message : 'unknown error';
        this.logger.warn(`Social provider failed: ${reason}`);
      }
    }

    const unique = new Map<string, SocialPost>();
    for (const post of posts) {
      unique.set(`${post.source}:${post.id}`, post);
    }

    const deduped = Array.from(unique.values()).sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.config.providerCacheTtlMs,
      posts: deduped,
    });
    return deduped;
  }
}
