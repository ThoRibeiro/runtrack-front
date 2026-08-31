import type { Page, PageRequest } from '../../shared/paging/page';
import type { ActivityId, CommentId, UserId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';
import type { FeedAuthor } from '../../feed/domain/feedItem';

export interface Comment {
  id: CommentId;
  author: FeedAuthor;
  body: string;
  postedAt: Instant;
  editedAt: Instant | undefined;
  parentId: CommentId | undefined;
  deleted: boolean;
}

export interface Likes {
  count: number;
  likedByMe: boolean;
  recent: readonly UserId[];
}

export interface EngagementGateway {
  likes(activityId: ActivityId): Promise<Likes>;
  like(activityId: ActivityId): Promise<Likes>;
  unlike(activityId: ActivityId): Promise<Likes>;
  comments(activityId: ActivityId, page: PageRequest): Promise<Page<Comment>>;
  postComment(activityId: ActivityId, body: string, parentId?: CommentId): Promise<Comment>;
  editComment(id: CommentId, body: string): Promise<Comment>;
  deleteComment(id: CommentId): Promise<void>;
}
