import { Injectable } from '@nestjs/common';
import { jaccardSimilarity, tokenize } from '../common/text.utils';
import { SocialPost } from '../social/providers/social-post-provider.interface';

export interface SocialCluster {
  id: string;
  posts: SocialPost[];
  keywords: string[];
  hashtags: string[];
  entities: string[];
}

@Injectable()
export class EventClusteringService {
  cluster(posts: SocialPost[]): SocialCluster[] {
    const clusters: SocialCluster[] = [];

    for (const post of posts) {
      const tokens = tokenize(post.text);
      const hashtags = post.hashtags.map((tag) => tag.toLowerCase());
      const entities = tokens.filter((token) => token.length > 3).slice(0, 8);

      let targetCluster: SocialCluster | undefined;
      let targetScore = 0;

      for (const cluster of clusters) {
        const score =
          jaccardSimilarity(tokens, cluster.keywords) * 0.45 +
          jaccardSimilarity(hashtags, cluster.hashtags) * 0.35 +
          jaccardSimilarity(entities, cluster.entities) * 0.2;

        if (score > 0.24 && score > targetScore) {
          targetCluster = cluster;
          targetScore = score;
        }
      }

      if (!targetCluster) {
        clusters.push({
          id: `cluster-${clusters.length + 1}`,
          posts: [post],
          keywords: tokens,
          hashtags,
          entities,
        });
        continue;
      }

      targetCluster.posts.push(post);
      targetCluster.keywords = Array.from(new Set([...targetCluster.keywords, ...tokens]));
      targetCluster.hashtags = Array.from(new Set([...targetCluster.hashtags, ...hashtags]));
      targetCluster.entities = Array.from(new Set([...targetCluster.entities, ...entities]));
    }

    return clusters.sort((left, right) => right.posts.length - left.posts.length);
  }
}
