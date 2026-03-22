import { Injectable } from '@nestjs/common';
import { toSlug, tokenize } from '../common/text.utils';
import { SocialPostService } from '../social/social-post.service';
import { DetectedEvent } from './dto/detected-event.dto';
import { EventClusteringService } from './event-clustering.service';
import { EventDetectionRulesService } from './event-detection-rules.service';

@Injectable()
export class EventExtractionService {
  constructor(
    private readonly socialPostService: SocialPostService,
    private readonly eventClusteringService: EventClusteringService,
    private readonly eventDetectionRulesService: EventDetectionRulesService,
  ) {}

  async detectEvents(): Promise<DetectedEvent[]> {
    const posts = await this.socialPostService.getRecentPosts();
    const clusters = this.eventClusteringService.cluster(posts);

    return clusters
      .filter((cluster) => this.eventDetectionRulesService.isHotCluster(cluster))
      .map((cluster) => {
        const sortedPosts = [...cluster.posts].sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
        );
        const first = sortedPosts[0];
        const last = sortedPosts[sortedPosts.length - 1];
        const rawText = sortedPosts.map((post) => post.text).join(' ');
        const tokens = tokenize(rawText).filter((token) => token.length > 3);
        const title = first.text.split(/[.!?]/)[0].slice(0, 120);
        const uniqueAuthors = new Set(sortedPosts.map((post) => post.authorId)).size;

        return {
          eventId: `cluster-${toSlug(title).slice(0, 48)}`,
          title,
          summary: title,
          category: this.inferCategory(tokens),
          firstSeenAt: first.createdAt,
          lastSeenAt: last.createdAt,
          source: sortedPosts.map((post) => post.source).join(','),
          rawMentionsCount: sortedPosts.length,
          uniqueAuthors,
          velocity1m: sortedPosts.filter(
            (post) => Date.now() - post.createdAt.getTime() <= 60_000,
          ).length,
          velocity5m: sortedPosts.filter(
            (post) => Date.now() - post.createdAt.getTime() <= 5 * 60_000,
          ).length,
          keywords: cluster.keywords.slice(0, 12),
          hashtags: cluster.hashtags.slice(0, 8),
          entities: cluster.entities.slice(0, 8),
          aliases: cluster.keywords.filter((token) => token.length >= 5).slice(0, 6),
          geoContext: cluster.entities.filter((entity) =>
            ['spain', 'portugal', 'egypt', 'saudi', 'red', 'sea'].includes(entity),
          ),
          confidence: Math.min(0.95, 0.45 + uniqueAuthors * 0.08 + sortedPosts.length * 0.05),
        } satisfies DetectedEvent;
      });
  }

  private inferCategory(tokens: string[]): string {
    if (tokens.some((token) => ['strike', 'war', 'border', 'attack'].includes(token))) {
      return 'geopolitics';
    }

    if (tokens.some((token) => ['celebrity', 'actor', 'viral', 'clip'].includes(token))) {
      return 'viral';
    }

    if (tokens.some((token) => ['outage', 'grid', 'blackout'].includes(token))) {
      return 'infrastructure';
    }

    return 'breaking-news';
  }
}
