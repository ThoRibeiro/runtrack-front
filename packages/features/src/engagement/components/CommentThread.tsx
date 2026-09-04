import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ActivityId, Comment, CommentId } from '@runtrack/core';
import {
  Avatar,
  FormField,
  Icon,
  Input,
  Pressable,
  Spinner,
  Text,
  controlHeight,
  iconSize,
  radius,
  space,
  useTheme,
} from '@runtrack/ui';
import { translate } from '../../i18n';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { commentsOf, useComments, useDeleteComment, usePostComment } from '../hooks/useEngagement';
import { useMe } from '../../user/hooks/useProfile';

/**
 * The comments of an activity (§10).
 *
 * Two decisions worth keeping:
 *
 *  - **a deleted comment keeps its place**, without its body. The server models
 *    it that way and it is right: a thread with holes in it reads as a bug, and
 *    a reply to a comment that vanished loses its meaning;
 *  - **l'auteur arrive avec le commentaire** : visage, nom, et rien à aller
 *    chercher par ligne. Le serveur les résout en une requête, comme pour le
 *    fil. Un compte disparu depuis laisse une ligne sans visage plutôt qu'un
 *    trou dans la conversation.
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
  mine,
  onDelete,
  onReply,
}: {
  comment: Comment;
  now: number;
  mine: boolean;
  onDelete: () => void;
  onReply: () => void;
}): ReactNode {
  const when = ago(comment.postedAt, now);
  const who = comment.author?.displayName ?? translate('engagement.aRunner');

  if (comment.deleted) {
    return (
      <View
        accessible
        accessibilityLabel={translate('engagement.deletedComment')}
        testID={`comment-${comment.id}`}
      >
        <Text tone="muted" variant="caption" decorative>
          {translate('engagement.deletedComment')}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}
      testID={`comment-${comment.id}`}
    >
      <Avatar name={who} uri={comment.author?.avatarUrl} size="sm" />

      <View style={{ flex: 1, gap: space.xxs }}>
        {/* §5 : une seule annonce — qui, quoi, quand — pas trois fragments. */}
        <View accessible accessibilityLabel={`${who}, ${comment.body}, ${when}`}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
            <Text variant="bodyStrong" decorative numberOfLines={1}>
              {who}
            </Text>
            <Text variant="caption" tone="muted" decorative>
              {when}
            </Text>
          </View>
          <Text decorative>{comment.body}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Pressable
            onPress={onReply}
            accessibilityRole="button"
            accessibilityLabel={translate('engagement.replyTo', { name: who })}
            enforceTouchTarget={false}
            testID={`comment-reply-${comment.id}`}
          >
            <Text variant="caption" tone="muted" decorative>
              {translate('engagement.reply')}
            </Text>
          </Pressable>

          {/* Supprimer n'apparaît que sur ses propres commentaires : le
              serveur refuse les autres, et proposer un geste refusé d'avance
              est une promesse qu'on ne tient pas. */}
          {mine && (
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel={translate('engagement.deleteComment')}
              enforceTouchTarget={false}
              testID={`comment-delete-${comment.id}`}
            >
              <Text variant="caption" tone="muted" decorative>
                {translate('engagement.deleteComment')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
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
  const [replyTo, setReplyTo] = useState<Comment | undefined>(undefined);
  const [now] = useState(() => runtime.clock.now());
  const me = useMe();
  const theme = useTheme();

  const comments = commentsOf(thread.data);

  // Le serveur rend une liste plate, ordonnée. On la replie en fil : les
  // racines dans leur ordre, chacune suivie de ses réponses.
  //
  // Un commentaire supprimé ne s'affiche que s'il porte encore des réponses :
  // sa ligne sert alors à leur donner un contexte. Sans réponse, « Commentaire
  // supprimé » n'apprend rien à personne et occupe le fil.
  const replies = new Map<CommentId, Comment[]>();
  for (const comment of comments) {
    if (comment.parentId === undefined || comment.deleted) continue;
    const siblings = replies.get(comment.parentId) ?? [];
    siblings.push(comment);
    replies.set(comment.parentId, siblings);
  }

  const roots = comments.filter(
    (comment) =>
      comment.parentId === undefined &&
      (!comment.deleted || (replies.get(comment.id)?.length ?? 0) > 0),
  );

  return (
    <View style={{ gap: space.sm }} testID={testID}>
      {thread.isPending && enabled ? (
        <Spinner label={translate('common.loading')} />
      ) : (
        roots.map((comment) => (
          <View key={comment.id} style={{ gap: space.sm }}>
            <CommentRow
              comment={comment}
              now={now}
              mine={comment.authorId === me.data?.id}
              onDelete={() => {
                remove.mutate(comment.id);
              }}
              onReply={() => {
                setReplyTo(comment);
              }}
            />

            {/*
              Les réponses vivent sous le commentaire auquel elles répondent,
              décalées : à plat, « @thoribeiro non » ne disait pas à quoi il
              répondait. Le serveur n'autorise qu'un niveau — au-delà, l'écran
              devient un arbre que personne ne sait dessiner sur un téléphone.
            */}
            {(replies.get(comment.id) ?? []).map((reply) => (
              <View key={reply.id} style={{ paddingLeft: space['2xl'] }}>
                <CommentRow
                  comment={reply}
                  now={now}
                  mine={reply.authorId === me.data?.id}
                  onDelete={() => {
                    remove.mutate(reply.id);
                  }}
                  // On répond au fil, pas à la réponse : c'est la règle du
                  // serveur, et proposer autre chose serait un refus annoncé.
                  onReply={() => {
                    setReplyTo(comment);
                  }}
                />
              </View>
            ))}
          </View>
        ))
      )}

      {enabled && comments.length === 0 && !thread.isPending && (
        <Text tone="muted" variant="caption">
          {translate('engagement.noComments')}
        </Text>
      )}

      {/*
        Une bulle, pas un formulaire : le visage de qui écrit, le champ, et
        l'envoi dedans. Le libellé du champ reste annoncé aux lecteurs d'écran
        — c'est le placeholder qui le dit à l'œil, et il disparaît à la frappe.
      */}
      {replyTo !== undefined && (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}
          testID="comment-replying-to"
        >
          <Text variant="caption" tone="muted" decorative>
            {translate('engagement.replyingTo', {
              name: replyTo.author?.displayName ?? translate('engagement.aRunner'),
            })}
          </Text>
          <Pressable
            onPress={() => {
              setReplyTo(undefined);
            }}
            accessibilityRole="button"
            accessibilityLabel={translate('common.cancel')}
            enforceTouchTarget={false}
            testID="comment-reply-cancel"
          >
            <Text variant="caption" tone="brand" decorative>
              {translate('common.cancel')}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Avatar name={me.data?.displayName ?? '?'} uri={me.data?.avatarUrl} size="sm" />
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
            paddingLeft: space.md,
            paddingRight: space.xs,
            borderRadius: radius.full,
            borderWidth: theme.stroke.hairline,
            borderColor: theme.colours.borderStrong,
            backgroundColor: theme.colours.surface,
          }}
        >
          {/*
            `flex: 1` sur le conteneur du champ, sans quoi il se réduit à sa
            largeur minimale : la bulle paraît pleine largeur mais la zone où
            l'on peut réellement appuyer fait quelques points de large.
          */}
          <View style={{ flex: 1 }}>
            <FormField label={translate('engagement.writeComment')} labelHidden>
              {(field) => (
                <Input
                  field={field}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={
                    me.data === undefined
                      ? translate('engagement.commentPlaceholder')
                      : translate('engagement.commentAs', { name: me.data.displayName })
                  }
                  variant="bare"
                  testID="comment-draft"
                />
              )}
            </FormField>
          </View>

          {/* Une icône d'envoi, comme partout ailleurs : le mot « Publier »
              prenait la moitié de la bulle pour dire ce qu'une flèche dit. */}
          <Pressable
            onPress={() => {
              post.mutate(
                // `parentId` fait la réponse : sans lui, le serveur range le
                // message à la racine et le fil se remet à plat.
                {
                  body: draft.trim(),
                  ...(replyTo === undefined ? {} : { parentId: replyTo.id }),
                },
                {
                  onSuccess: () => {
                    setDraft('');
                    setReplyTo(undefined);
                  },
                },
              );
            }}
            disabled={draft.trim() === '' || post.isPending}
            accessibilityRole="button"
            accessibilityLabel={translate('engagement.postComment')}
            enforceTouchTarget={false}
            testID="comment-post"
          >
            <View
              style={{
                width: controlHeight.sm,
                height: controlHeight.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.full,
                backgroundColor:
                  draft.trim() === '' ? theme.colours.surfaceAlt : theme.colours.brand.fill,
              }}
            >
              <Icon
                name="send"
                size={iconSize.sm}
                colour={draft.trim() === '' ? theme.colours.textMuted : theme.colours.brand.onFill}
              />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
