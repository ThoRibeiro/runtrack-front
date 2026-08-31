import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { iconSize, space } from '../tokens';
import { Divider } from './Divider';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Key/value rows separated by hairlines inside a `surface-alt` container — the
 * settings and profile blocks of the reference.
 *
 * Each row announces itself as one thing: "Heures calmes, 22 h – 7 h". Split
 * into two nodes it reads as two unrelated fragments.
 */
export interface GroupedRow {
  key: string;
  label: string;
  value?: string | undefined;
  onPress?: (() => void) | undefined;
  /** Replaces the value — a `Switch` inside a `FormField`, typically. */
  accessory?: ReactNode | undefined;
}

export interface GroupedRowsProps {
  rows: readonly GroupedRow[];
  testID?: string | undefined;
}

export function GroupedRows({ rows, testID }: GroupedRowsProps): ReactNode {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={{
        borderRadius: theme.radius.md,
        backgroundColor: theme.colours.surfaceAlt,
        overflow: 'hidden',
      }}
    >
      {rows.map((row, index) => {
        const spoken = row.value === undefined ? row.label : `${row.label}, ${row.value}`;
        const content = (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space.sm,
              minHeight: space['4xl'],
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
            }}
          >
            <Text decorative>{row.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              {row.accessory ??
                (row.value !== undefined && (
                  <Text tone="muted" decorative>
                    {row.value}
                  </Text>
                ))}
              {row.onPress !== undefined && (
                <Icon name="chevron-right" size={iconSize.md} colour={theme.colours.textMuted} />
              )}
            </View>
          </View>
        );

        return (
          <Fragment key={row.key}>
            {index > 0 && <Divider inset={space.md} />}
            {row.onPress === undefined ? (
              <View accessible accessibilityLabel={spoken}>
                {content}
              </View>
            ) : (
              <Pressable
                onPress={row.onPress}
                accessibilityLabel={spoken}
                enforceTouchTarget={false}
              >
                {content}
              </Pressable>
            )}
          </Fragment>
        );
      })}
    </View>
  );
}
