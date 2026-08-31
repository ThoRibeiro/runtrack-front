import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import type { FollowRequest } from '@runtrack/core';
import { Button, Card, List, Text, space, useTheme } from '@runtrack/ui';
import { describeError, translate } from '../../i18n';
import { useAnswerFollowRequest, useFollowRequests } from '../hooks/useSocial';

/**
 * §10's "demandes". The server sends the requester's **id** and nothing else —
 * no handle, no display name — so a row can offer the decision but not say who
 * is asking. That gap, and the change it needs on the server, are in
 * `docs/decisions-lot-6.md`.
 */
export function FollowRequestsScreen(): ReactNode {
  const theme = useTheme();
  const requests = useFollowRequests();
  const answer = useAnswerFollowRequest();
  const described = requests.error === null ? undefined : describeError(requests.error);

  const renderItem = ({ item }: { item: FollowRequest }): ReactElement => (
    <Card>
      <View
        accessible
        accessibilityLabel={translate('social.requestFrom', { id: item.followerId })}
        style={{ gap: space.sm }}
      >
        <Text variant="bodyStrong" decorative>
          {translate('social.requestFrom', { id: item.followerId })}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            label={translate('social.accept')}
            onPress={() => {
              answer.mutate({ id: item.followerId, accept: true });
            }}
            style={{ flex: 1 }}
            testID={`request-accept-${item.followerId}`}
          />
          <Button
            label={translate('social.reject')}
            variant="outline"
            onPress={() => {
              answer.mutate({ id: item.followerId, accept: false });
            }}
            style={{ flex: 1 }}
            testID={`request-reject-${item.followerId}`}
          />
        </View>
      </View>
    </Card>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md }}
      testID="follow-requests-screen"
    >
      <List
        data={requests.isPending ? undefined : (requests.data ?? [])}
        renderItem={renderItem}
        keyExtractor={(item) => item.requestId}
        emptyTitle={translate('social.requestsEmpty')}
        emptyDescription={translate('social.requestsEmptyDetail')}
        loading={requests.isPending}
        loadingLabel={translate('common.loading')}
        error={
          described === undefined
            ? undefined
            : { title: described.title, message: described.detail }
        }
        onRetry={() => {
          void requests.refetch();
        }}
        testID="follow-requests-list"
      />
    </View>
  );
}
