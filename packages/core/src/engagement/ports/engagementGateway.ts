import type { Page, PageRequest } from '../../shared/paging/page';
import type { ActivityId, CommentId, UserId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';

/**
 * The server sends an author **id**, not an author object: a thread of two
 * hundred comments would otherwise repeat the same profile two hundred times.
 * The shell resolves the ids it needs, once.
 */
/** Ce qu'il faut pour dessiner une ligne : un visage, un nom. */
export interface CommentAuthor {
  id: UserId;
  handle: string;
  displayName: string;
  avatarUrl: string | undefined;
}

export interface Comment {
  id: CommentId;
  activityId: ActivityId;
  authorId: UserId;
  /** Absent d'un commentaire dont le compte a disparu depuis. */
  author: CommentAuthor | undefined;
  body: string;
  postedAt: Instant;
  editedAt: Instant | undefined;
  parentId: CommentId | undefined;
  /** A deleted comment keeps its place in the thread, without its body. */
  deleted: boolean;
}

export interface Likes {
  total: number;
  likedByViewer: boolean;
  /** A handful of recent likers, for the "aimé par …" line. */
  recentUserIds: readonly UserId[];
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
