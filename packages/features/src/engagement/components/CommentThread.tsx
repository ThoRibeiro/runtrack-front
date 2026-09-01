import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ActivityId, Comment } from '@runtrack/core';
import { Button, Card, FormField, Spinner, Text, TextArea, space } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { commentsOf, useComments, useDeleteComment, usePostComment } from '../hooks/useEngagement';

/**
 * The comments of an activity (§10).
 *
 * Two decisions worth keeping:
 *
 *  - **a deleted comment keeps its place**, without its body. The server models
 *    it that way and it is right: a thread with holes in it reads as a bug, and
 *    a reply to a comment that vanished loses its meaning;
 *  - **the author is an id.** The server sends ids rather than repeating a
 *    profile two hundred times, and there is no endpoint that resolves one — the
 *    same gap as lot 6, §2. So a comment is attributed to "un coureur" rather
 *    than to a wrong name, and the demand is recorded there.
 */
export interface CommentThreadProps {
  activityId: ActivityId;
  /** Off until the section is opened: a thread is a request nobody asked for. */
  enabled?: boolean | undefined;
  testID?: string | undefined;
}

function ago(postedAt: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - postedAt) / 60_000));
  if (minutes < 1) return translate('inbox.justNow');
  if (minutes < 60) return translate('inbox.minutesAgo', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return translate('inbox.hoursAgo', { count: hours });
  return translate('inbox.daysAgo', { count: Math.round(hours / 24) });
}

function CommentRow({
  comment,
  now,
  onDelete,
}: {
  comment: Comment;
  now: number;
  onDelete: () => void;
}): ReactNode {
  const when = ago(comment.postedAt, now);

  if (comment.deleted) {
    return (
      <View
        accessible
        accessibilityLabel={translate('engagement.deletedComment')}
        testID={`comment-${comment.id}`}
      >
        <Text tone="muted" decorative>
          {translate('engagement.deletedComment')}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      // §5: one announcement — who, what, when — not three fragments.
      accessibilityLabel={`${translate('engagement.aRunner')}, ${comment.body}, ${when}`}
      testID={`comment-${comment.id}`}
    >
      <Text variant="caption" tone="muted" decorative>
        {`${translate('engagement.aRunner')} · ${when}`}
      </Text>
      <Text decorative>{comment.body}</Text>
      <Button
        variant="ghost"
        size="sm"
        label={translate('engagement.deleteComment')}
        onPress={onDelete}
        testID={`comment-delete-${comment.id}`}
      />
    </View>
  );
}

export function CommentThread({
  activityId,
  enabled = true,
  testID,
}: CommentThreadProps): ReactNode {
  const runtime = useRuntime();
  const thread = useComments(activityId, enabled);
  const post = usePostComment(activityId);
  const remove = useDeleteComment(activityId);
  const [draft, setDraft] = useState('');
  const [now] = useState(() => runtime.clock.now());

  const comments = commentsOf(thread.data);

  return (
    <View style={{ gap: space.sm }} testID={testID}>
      {thread.isPending && enabled ? (
        <Spinner label={translate('common.loading')} />
      ) : (
        comments.map((comment) => (
          <Card key={comment.id} tone="alt">
            <CommentRow
              comment={comment}
              now={now}
              onDelete={() => {
                remove.mutate(comment.id);
              }}
            />
          </Card>
        ))
      )}

      {enabled && comments.length === 0 && !thread.isPending && (
        <Text tone="muted" variant="caption">
          {translate('engagement.noComments')}
        </Text>
      )}

      {thread.hasNextPage && (
        <Button
          variant="ghost"
          label={translate('engagement.moreComments')}
          loading={thread.isFetchingNextPage}
          onPress={() => {
            void thread.fetchNextPage();
          }}
          testID="comments-more"
        />
      )}

      <FormField label={translate('engagement.writeComment')}>
        {(field) => (
          <TextArea
            field={field}
            value={draft}
            onChangeText={setDraft}
            placeholder={translate('engagement.commentPlaceholder')}
            testID="comment-draft"
          />
        )}
      </FormField>
      <Button
        label={translate('engagement.postComment')}
        loading={post.isPending}
        disabled={draft.trim() === ''}
        onPress={() => {
          post.mutate(
            { body: draft.trim() },
            {
              onSuccess: () => {
                setDraft('');
              },
            },
          );
        }}
        testID="comment-post"
      />
    </View>
  );
}
