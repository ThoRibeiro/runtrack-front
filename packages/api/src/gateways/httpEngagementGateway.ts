import {
  commentId as toCommentId,
  activityId as toActivityId,
  userId as toUserId,
  type ActivityId,
  type Comment,
  type CommentId,
  type EngagementGateway,
  type Likes,
  type Page,
  type PageRequest,
} from '@runtrack/core';
import type { components } from '../generated/schema';
import { toPage, type CursorPage, type HttpClient } from '../http/httpClient';
import { required, toInstant, toOptionalInstant, toOptionalString } from '../mappers/primitives';

type CommentResponse = components['schemas']['CommentResponse'];
type LikesResponse = components['schemas']['LikesResponse'];

export function toComment(dto: CommentResponse): Comment {
  const parent = toOptionalString(dto.parentId);
  return {
    id: toCommentId(required(dto.id, 'id de commentaire')),
    activityId: toActivityId(required(dto.activityId, 'course du commentaire')),
    authorId: toUserId(required(dto.authorId, 'auteur du commentaire')),
    // §: a deleted comment keeps its place in the thread, without its body.
    body: dto.body ?? '',
    postedAt: toInstant(required(dto.createdAt, 'date du commentaire')),
    editedAt: toOptionalInstant(dto.editedAt),
    parentId: parent === undefined ? undefined : toCommentId(parent),
    deleted: dto.deleted ?? false,
  };
}

export function toLikes(dto: LikesResponse): Likes {
  return {
    total: dto.total ?? 0,
    likedByViewer: dto.likedByViewer ?? false,
    recentUserIds: (dto.recentUserIds ?? []).map((id) => toUserId(id)),
  };
}

/**
 * Likes and comments (§10).
 *
 * Every mutation answers with the **new state** rather than nothing: liking
 * returns the count and whether the viewer likes it, which is what lets a heart
 * settle on the truth instead of on what the client guessed.
 */
export class HttpEngagementGateway implements EngagementGateway {
  constructor(private readonly http: HttpClient) {}

  async likes(activityId: ActivityId): Promise<Likes> {
    return toLikes(await this.http.request<LikesResponse>(`/race/v1/${activityId}/likes`));
  }

  async like(activityId: ActivityId): Promise<Likes> {
    return toLikes(
      await this.http.request<LikesResponse>(`/race/v1/${activityId}/likes`, { method: 'POST' }),
    );
  }

  async unlike(activityId: ActivityId): Promise<Likes> {
    return toLikes(
      await this.http.request<LikesResponse>(`/race/v1/${activityId}/likes`, { method: 'DELETE' }),
    );
  }

  async comments(activityId: ActivityId, page: PageRequest): Promise<Page<Comment>> {
    const dto = await this.http.request<CursorPage<CommentResponse>>(
      `/race/v1/${activityId}/comments`,
      { query: { cursor: page.cursor, limit: page.limit } },
    );
    return toPage(dto, toComment);
  }

  async postComment(activityId: ActivityId, body: string, parentId?: CommentId): Promise<Comment> {
    return toComment(
      await this.http.request<CommentResponse>(`/race/v1/${activityId}/comments`, {
        method: 'POST',
        body: { body, parentId },
      }),
    );
  }

  async editComment(id: CommentId, body: string): Promise<Comment> {
    return toComment(
      await this.http.request<CommentResponse>(`/comment/v1/${id}`, {
        method: 'PATCH',
        body: { body },
      }),
    );
  }

  async deleteComment(id: CommentId): Promise<void> {
    await this.http.requestVoid(`/comment/v1/${id}`, { method: 'DELETE' });
  }
}
