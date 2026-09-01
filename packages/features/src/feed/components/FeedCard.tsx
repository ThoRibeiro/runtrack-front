import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  Avatar,
  Card,
  Chip,
  Icon,
  Pressable,
  StatTile,
  Text,
  iconSize,
  space,
  useTheme,
} from '@runtrack/ui';
import { isLive, type FeedItem } from '@runtrack/core';
import { formatDuration, formatKilometres, spokenDuration } from '../../format';
import { translate } from '../../i18n';

/**
 * One card in the feed.
 *
 * §5: the card announces itself as **one** sentence — who, what, how far, how
 * long — and every string inside is decorative. Four separate nodes would make
 * a screen reader read "Camille", "Sortie du matin", "12,4", "km", "1:02" as
 * five unrelated things.
 */
export interface FeedCardProps {
  item: FeedItem;
  onPress: () => void;
}

export function FeedCard({ item, onPress }: FeedCardProps): ReactNode {
  const theme = useTheme();
  const live = isLive(item);

  const spoken = [
    item.author.displayName,
    item.title,
    `${formatKilometres(item.distanceMetres)} ${translate('common.spokenKilometres')}`,
    spokenDuration(item.movingTimeSeconds),
    live ? translate('feed.liveNow') : undefined,
  ]
    .filter((part): part is string => part !== undefined)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={spoken}
      enforceTouchTarget={false}
      testID={`feed-card-${item.activityId}`}
    >
      <Card tone="plain">
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Avatar name={item.author.displayName} uri={item.author.avatarUrl} size="sm" />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" decorative numberOfLines={1}>
                {item.author.displayName}
              </Text>
              <Text variant="caption" tone="muted" decorative numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            {/* §15: never carried by colour alone — the chip has an icon and a word. */}
            {live && <Chip label={translate('feed.liveNow')} icon="live" selected />}
          </View>

          <View style={{ flexDirection: 'row', gap: space.xl }}>
            <StatTile
              label={translate('home.distance')}
              value={formatKilometres(item.distanceMetres)}
              unit={translate('common.km')}
              spokenUnit={translate('common.spokenKilometres')}
            />
            <StatTile
              label={translate('activity.movingTime')}
              value={formatDuration(item.movingTimeSeconds)}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
              <Icon name="heart" size={iconSize.sm} colour={theme.colours.textMuted} />
              <Text variant="caption" tone="muted" decorative>
                {String(item.likeCount)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
              <Icon name="message-circle" size={iconSize.sm} colour={theme.colours.textMuted} />
              <Text variant="caption" tone="muted" decorative>
                {String(item.commentCount)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
