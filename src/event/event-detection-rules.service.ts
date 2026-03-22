import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { SocialCluster } from './event-clustering.service';

@Injectable()
export class EventDetectionRulesService {
  private readonly config: AppConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.getOrThrow<AppConfig>('app');
  }

  isHotCluster(cluster: SocialCluster): boolean {
    const uniqueAuthors = new Set(cluster.posts.map((post) => post.authorId)).size;
    const recentPosts = cluster.posts.filter(
      (post) => Date.now() - post.createdAt.getTime() <= 5 * 60_000,
    );
    const velocity1m = cluster.posts.filter(
      (post) => Date.now() - post.createdAt.getTime() <= 60_000,
    ).length;
    const averageEngagement =
      cluster.posts.reduce((sum, post) => sum + post.engagementScore, 0) /
      Math.max(cluster.posts.length, 1);

    return (
      cluster.posts.length >= 2 &&
      uniqueAuthors >= this.config.minEventUniqueAuthors5m &&
      recentPosts.length >= 2 &&
      velocity1m >= Math.max(1, Math.floor(this.config.minEventMentionVelocity1m / 4)) &&
      averageEngagement >= 20
    );
  }
}
