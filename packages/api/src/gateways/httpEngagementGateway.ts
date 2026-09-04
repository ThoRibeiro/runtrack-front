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
    // Absent quand le compte a disparu depuis : la ligne reste lisible, sans
    // visage — c'est mieux qu'un fil amputé de ses réponses.
    author:
      dto.author === undefined
        ? undefined
        : {
            id: toUserId(required(dto.author.id, 'auteur du commentaire')),
            handle: dto.author.handle ?? '',
            displayName: dto.author.displayName ?? '',
            avatarUrl: toOptionalString(dto.author.avatarUrl),
          },
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
 * Aimer et retirer son « j'aime » répondent **204, sans corps** : l'état
 * d'après se relit. Réclamer un corps ici, c'était « Réponse vide là où un
 * corps était attendu » à chaque appui sur le cœur — l'appel échouait alors que
 * le serveur avait bien enregistré le geste, et le compteur ne bougeait pas.
 */
export class HttpEngagementGateway implements EngagementGateway {
  constructor(private readonly http: HttpClient) {}

  async likes(activityId: ActivityId): Promise<Likes> {
    return toLikes(await this.http.request<LikesResponse>(`/race/v1/${activityId}/likes`));
  }

  async like(activityId: ActivityId): Promise<Likes> {
    await this.http.requestVoid(`/race/v1/${activityId}/likes`, { method: 'POST' });
    return this.likes(activityId);
  }

  async unlike(activityId: ActivityId): Promise<Likes> {
    await this.http.requestVoid(`/race/v1/${activityId}/likes`, { method: 'DELETE' });
    return this.likes(activityId);
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
