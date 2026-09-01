import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ActivityId, ShareLink } from '@runtrack/core';
import { Button, Card, GroupedRows, Sheet, Text, space } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useCreateShareLink, useRevokeShareLink, useShareLinks } from '../hooks/useEngagement';

/**
 * Share links (§10).
 *
 * The thing to get right is that **the clear token exists once**. The server
 * returns it on creation and never again — a listed link has an id, a count and
 * a date, and no token. So the sheet says so, plainly, at the moment it matters:
 * copy it now or ask for another one.
 *
 * And it says what a link *does* before creating one. "Quiconque l'a peut la
 * voir" is not a warning to bury: a share link makes a private activity
 * readable by anyone holding a URL, including people the runner blocked.
 */
export interface ShareSheetProps {
  activityId: ActivityId;
  visible: boolean;
  onClose: () => void;
  /** Handed the full URL to copy; the shell owns the clipboard. */
  onCopy?: ((url: string) => void) | undefined;
  /** The API origin, so a token becomes a URL someone can open. */
  baseUrl: string;
}

const VALIDITIES = [
  { hours: undefined, label: 'share.forever' as const },
  { hours: 24, label: 'share.for24h' as const },
  { hours: 24 * 7, label: 'share.for7d' as const },
];

function urlOf(link: ShareLink, baseUrl: string): string {
  return link.url === '' ? `${baseUrl}/shared/v1/${link.token}` : `${baseUrl}${link.url}`;
}

export function ShareSheet({
  activityId,
  visible,
  onClose,
  onCopy,
  baseUrl,
}: ShareSheetProps): ReactNode {
  const links = useShareLinks(activityId, visible);
  const create = useCreateShareLink(activityId);
  const revoke = useRevokeShareLink(activityId);
  const [validForHours, setValidForHours] = useState<number | undefined>(undefined);

  const fresh = create.data;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={translate('share.title')}
      testID="share-sheet"
    >
      <View style={{ gap: space.md }}>
        <Text tone="muted">{translate('share.explain')}</Text>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {VALIDITIES.map((validity) => (
            <Button
              key={validity.label}
              variant={validForHours === validity.hours ? 'solid' : 'outline'}
              size="sm"
              label={translate(validity.label)}
              onPress={() => {
                setValidForHours(validity.hours);
              }}
              testID={`share-validity-${validity.label}`}
            />
          ))}
        </View>

        <Button
          label={translate('share.create')}
          icon="share"
          loading={create.isPending}
          onPress={() => {
            create.mutate(validForHours);
          }}
          testID="share-create"
        />

        {fresh !== undefined && fresh.token !== '' && (
          <Card tone="brand" testID="share-fresh">
            <View style={{ gap: space.sm }}>
              {/* La seule fois où le jeton existe ailleurs que chez son porteur. */}
              <Text>{translate('share.tokenOnce')}</Text>
              <Text variant="caption" tone="muted">
                {urlOf(fresh, baseUrl)}
              </Text>
              {onCopy !== undefined && (
                <Button
                  variant="outline"
                  label={translate('share.copy')}
                  onPress={() => {
                    onCopy(urlOf(fresh, baseUrl));
                  }}
                  testID="share-copy"
                />
              )}
            </View>
          </Card>
        )}

        <Text variant="section">{translate('share.existing')}</Text>
        {(links.data ?? []).length === 0 ? (
          <Text tone="muted" variant="caption">
            {translate('share.noLinks')}
          </Text>
        ) : (
          <GroupedRows
            testID="share-links"
            rows={(links.data ?? []).map((link) => ({
              key: link.id,
              label: translate('share.views', { count: link.viewCount }),
              value: translate('share.revoke'),
              onPress: () => {
                revoke.mutate(link.id);
              },
            }))}
          />
        )}
      </View>
    </Sheet>
  );
}
