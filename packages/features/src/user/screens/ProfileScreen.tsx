import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { goalProgress, paceOver, STATS_PERIODS } from '@runtrack/core';
import type {
  Activity,
  ActivityId,
  PublicProfile,
  RunnerTotals,
  StatsPeriod,
  UserId,
} from '@runtrack/core';
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  FloatingIconButton,
  GroupedRows,
  MetricCard,
  Modal,
  ProgressRing,
  List,
  Pressable,
  ScreenHeader,
  SectionHeader,
  Sheet,
  Skeleton,
  StatTile,
  Tabs,
  Text,
  radius,
  space,
  transitionsFor,
  useReduceMotion,
  useTheme,
} from '@runtrack/ui';
import {
  formatDay,
  formatDuration,
  formatKilometres,
  formatPace,
  formatWhole,
  spokenDuration,
  spokenPace,
} from '../../format';
import { describeError, translate } from '../../i18n';
import {
  useBlock,
  useFollow,
  useFollowers,
  useFollowing,
  useUnblock,
  useUnfollow,
} from '../../social/hooks/useSocial';
import { TrackPreview } from '../../map';
import { useActivitiesOf } from '../hooks/useActivitiesOf';
import { currentTimeZone, useMe, useMyStats, useProfile } from '../hooks/useProfile';

/**
 * A runner's profile — someone else's, or one's own.
 *
 * The shape is the one every social profile has settled on, because it answers
 * the two questions a visitor arrives with in one screen-height: *who is this*
 * (avatar, name, counts, bio) and *what have they run* (a grid of shapes). What
 * is borrowed is the skeleton; what fills it is ours — the tiles are traces and
 * not photographs, and a run is recognised by its outline long before its title
 * is read. That is the whole reason the grid comes first.
 *
 * The counts come from three separate queries because the server sends them
 * that way: `PublicProfile` carries neither a follower count nor an activity
 * one. It is noted in `docs/decisions-lot-6.md` alongside the larger gap it
 * belongs to.
 */
export interface ProfileScreenProps {
  handle: string;
  /** Own profile: no follow button, a sign-out one instead. */
  isMe: boolean;
  onOpenActivity: (id: ActivityId) => void;
  onOpenFollowers: (id: UserId) => void;
  onOpenFollowing: (id: UserId) => void;
  onSignOut?: (() => void) | undefined;
  /** Own profile only: where the name, the bio and the physiology are changed. */
  onEditProfile?: (() => void) | undefined;
  /** Someone else's profile is reached from somewhere, and one comes back. */
  onBack?: (() => void) | undefined;
}

export function ProfileScreen({
  handle,
  isMe,
  onOpenActivity,
  onOpenFollowers,
  onOpenFollowing,
  onSignOut,
  onEditProfile,
  onBack,
}: ProfileScreenProps): ReactNode {
  const theme = useTheme();
  const profile = useProfile(handle);

  if (profile.isPending) {
    return (
      <View
        style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md, gap: space.sm }}
        testID="profile-loading"
      >
        <Skeleton width={72} height={72} rounded="full" />
        <Skeleton width="50%" height={theme.typography.title.lineHeight} />
        <Skeleton width="30%" height={theme.typography.body.lineHeight} />
      </View>
    );
  }

  if (profile.isError) {
    const described = describeError(profile.error);
    return (
      <ErrorState
        title={described.title}
        message={described.detail}
        correlationId={described.correlationId}
        onRetry={() => {
          void profile.refetch();
        }}
        testID="profile-error"
      />
    );
  }

  return (
    <ProfileBody
      profile={profile.data}
      isMe={isMe}
      onOpenActivity={onOpenActivity}
      onOpenFollowers={onOpenFollowers}
      onOpenFollowing={onOpenFollowing}
      onSignOut={onSignOut}
      onEditProfile={onEditProfile}
      onBack={onBack}
    />
  );
}

/** Grid first: it is the view that shows a season at a glance. */
type ActivityView = 'grid' | 'list';

/** The gutter of the grid, equal to the list's own row separator. */
const GRID_GUTTER = space.sm;
const GRID_COLUMNS = 3;

/**
 * The list is fed rows and never activities, in both views — a row of three in
 * the grid, a row of one in the list.
 *
 * It looks roundabout and it is the whole reason switching views keeps its
 * place: `numColumns` cannot change under FlashList without remounting it, and
 * a remount sends the reader back to the top of a profile they had scrolled
 * halfway down. Composing the rows ourselves means the list never changes
 * shape — only what it draws in each row does.
 */
function rowsOf(items: readonly Activity[], perRow: number): Activity[][] {
  const rows: Activity[][] = [];
  for (let index = 0; index < items.length; index += perRow) {
    rows.push(items.slice(index, index + perRow));
  }
  return rows;
}

function ProfileBody({
  profile,
  isMe,
  onOpenActivity,
  onOpenFollowers,
  onOpenFollowing,
  onSignOut,
  onEditProfile,
  onBack,
}: Omit<ProfileScreenProps, 'handle'> & { profile: PublicProfile }): ReactNode {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const followers = useFollowers(profile.id);
  const following = useFollowing(profile.id);
  const activities = useActivitiesOf(profile.id);
  const follow = useFollow();
  const unfollow = useUnfollow();
  const block = useBlock();
  const unblock = useUnblock();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  /**
   * Bloqué *pendant cette visite*, et rien de plus.
   *
   * Le serveur ne dit nulle part qu'un compte est bloqué : ni le profil public
   * ni une liste de blocages. On ne peut donc proposer le déblocage que dans la
   * foulée du blocage ; en revenant plus tard, l'écran ne le sait plus. Le
   * manque est côté API, et il est écrit ici parce que c'est ici qu'il se voit.
   */
  const [blocked, setBlocked] = useState(false);

  const me = useMe();
  /**
   * Suivi, en trois sources qui ne se contredisent pas : la liste d'abonnés
   * pour l'état d'arrivée, et le résultat des deux mutations pour la fraction
   * de seconde où le serveur n'a pas encore réinvalidé cette liste.
   */
  const pendingRequest = follow.data === 'PENDING';
  const isFollowing =
    !unfollow.isSuccess &&
    (follow.data === 'ACCEPTED' ||
      (me.data !== undefined && (followers.data?.userIds.includes(me.data.id) ?? false)));
  const [view, setView] = useState<ActivityView>('grid');
  const [period, setPeriod] = useState<StatsPeriod>('WEEK');
  const motion = transitionsFor(useReduceMotion());

  // Les chiffres sont ceux du coureur connecté : le serveur ne les publie que
  // pour soi, et un profil visité ne les demande donc pas du tout.
  const zone = useMemo(() => currentTimeZone(), []);
  const stats = useMyStats(period, zone, isMe);
  /**
   * L'objectif se lit toujours sur la semaine, quelle que soit la période lue
   * en dessous — sans requête à lui, « 6 sur 40 km » afficherait les kilomètres
   * de l'année dès qu'on changeait d'onglet. Sur « Semaine » les deux requêtes
   * partagent leur clé de cache, et il n'en part qu'une.
   */
  const weekly = useMyStats('WEEK', zone, isMe);
  // Le compteur de l'en-tête compte *toutes* les courses, quelle que soit la
  // période lue en dessous. Sur « Total » les deux requêtes partagent leur clé
  // de cache, et il n'en part qu'une.
  const lifetime = useMyStats('ALL', zone, isMe);
  const totals = isMe ? stats.data : undefined;

  const items = useMemo(
    () => activities.data?.pages.flatMap((page) => page.items) ?? [],
    [activities.data],
  );
  const rows = useMemo(() => rowsOf(items, view === 'grid' ? GRID_COLUMNS : 1), [items, view]);
  const cellSize = (width - 2 * space.md - (GRID_COLUMNS - 1) * GRID_GUTTER) / GRID_COLUMNS;

  /** One announcement per run, in both views — §5 forbids the four fragments. */
  const labelOf = (item: Activity): string =>
    `${item.title}, ${formatDay(item.startedAt)}, ${formatKilometres(item.stats.distanceMetres)} ${translate('common.spokenKilometres')}, ${spokenDuration(item.stats.movingTimeSeconds)}`;

  const tile = useCallback(
    (item: Activity): ReactNode => (
      <Pressable
        key={item.id}
        onPress={() => {
          onOpenActivity(item.id);
        }}
        accessibilityLabel={labelOf(item)}
        enforceTouchTarget={false}
        style={{ width: cellSize, gap: space.xxs }}
        testID={`profile-activity-${item.id}`}
      >
        <View style={{ borderRadius: radius.md, overflow: 'hidden' }}>
          {/*
            La vraie carte, et pas seulement le tracé : sans fond, deux boucles
            du même quartier se ressemblent toutes. Ce que ça coûte est réel —
            une carte vivante par case — et c'est la virtualisation de la liste
            qui le rend tenable : seules les rangées à l'écran en montent une.
          */}
          <TrackPreview
            polyline={item.previewPolyline}
            height={cellSize}
            testID={`profile-tile-${item.id}`}
          />
        </View>
        {/*
          La distance sous la vignette et non dessus : le fournisseur de tuiles
          pose sa marque et sa mention légale dans ce coin-là, et rien ne doit
          les recouvrir — c'est une obligation de la carte, pas une préférence.
        */}
        <Text variant="caption" tone="muted" decorative>
          {`${formatKilometres(item.stats.distanceMetres)} ${translate('common.km')}`}
        </Text>
      </Pressable>
    ),
    [cellSize, onOpenActivity],
  );

  const card = useCallback(
    (item: Activity): ReactNode => (
      <Pressable
        key={item.id}
        onPress={() => {
          onOpenActivity(item.id);
        }}
        accessibilityLabel={labelOf(item)}
        enforceTouchTarget={false}
        testID={`profile-activity-${item.id}`}
      >
        <Card tone="outlined">
          <View style={{ gap: space.sm }}>
            {/* Le jour à droite du titre : c'est ce qui distingue deux
                « Sortie du jour » l'une de l'autre. */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
              <Text variant="bodyStrong" decorative numberOfLines={1} style={{ flex: 1 }}>
                {item.title}
              </Text>
              <Text variant="caption" tone="muted" decorative>
                {formatDay(item.startedAt)}
              </Text>
            </View>
            {/* Le parcours : on reconnaît une sortie à sa forme avant de lire son titre. */}
            <TrackPreview
              polyline={item.previewPolyline}
              height={120}
              testID={`profile-track-${item.id}`}
            />
            <View style={{ flexDirection: 'row', gap: space.xl }}>
              <StatTile
                label={translate('activity.distance')}
                value={formatKilometres(item.stats.distanceMetres)}
                unit={translate('common.km')}
              />
              <StatTile
                label={translate('activity.duration')}
                value={formatDuration(item.stats.movingTimeSeconds)}
              />
            </View>
          </View>
        </Card>
      </Pressable>
    ),
    [onOpenActivity],
  );

  const renderRow = useCallback(
    ({ item: row }: { item: Activity[] }) =>
      view === 'grid' ? (
        <View style={{ flexDirection: 'row', gap: GRID_GUTTER }}>{row.map(tile)}</View>
      ) : (
        <View>{row.map(card)}</View>
      ),
    [view, tile, card],
  );

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.sm }}>
      {/*
        L'avatar et les compteurs sur une ligne, le nom en dessous : c'est ce qui
        tient l'identité, les chiffres et la première rangée de courses dans une
        hauteur d'écran. Centrer le tout, comme avant, poussait les courses sous
        la ligne de flottaison — or c'est pour elles qu'on ouvre un profil.
      */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Avatar name={profile.displayName} uri={profile.avatarUrl} size="2xl" decorative />
        {/*
          `space-around` et non trois colonnes étirées : à pleine largeur, les
          compteurs laissaient un trou après l'avatar et collaient « Suivis » au
          bord droit. Les demi-marges des extrémités rapprochent le groupe des
          deux côtés à la fois.
        */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          {/*
            `isMe` et pas seulement « la donnée est là » : `enabled: false`
            n'efface pas ce que React Query a déjà en cache sous la même clé.
            En passant de son propre profil à celui d'un autre, le compteur
            servait *mes* courses sous le nom de quelqu'un d'autre.
          */}
          {isMe && lifetime.data !== undefined && (
            <Count
              value={formatWhole(lifetime.data.activityCount)}
              label={translate('profile.activities')}
              accessibilityLabel={translate('profile.runCount', {
                count: lifetime.data.activityCount,
              })}
              testID="profile-run-count"
            />
          )}
          <Count
            value={formatWhole(followers.data?.count ?? 0)}
            label={translate('profile.followers')}
            accessibilityLabel={translate('social.followerCount', {
              count: followers.data?.count ?? 0,
            })}
            onPress={() => {
              onOpenFollowers(profile.id);
            }}
            testID="profile-followers"
          />
          <Count
            value={formatWhole(following.data?.count ?? 0)}
            label={translate('profile.following')}
            accessibilityLabel={translate('social.followingCount', {
              count: following.data?.count ?? 0,
            })}
            onPress={() => {
              onOpenFollowing(profile.id);
            }}
            testID="profile-following"
          />
        </View>
      </View>

      <View style={{ gap: space.xxs }}>
        <Text variant="bodyStrong">{profile.displayName}</Text>
        {profile.bio !== undefined && <Text>{profile.bio}</Text>}
      </View>

      {isMe ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {onEditProfile !== undefined && (
            <Button
              label={translate('profile.edit')}
              variant="outline"
              onPress={onEditProfile}
              style={{ flex: 1 }}
              testID="profile-edit"
            />
          )}
          <Button
            label={translate('profile.signOut')}
            variant="outline"
            onPress={onSignOut}
            style={{ flex: 1 }}
            testID="profile-sign-out"
          />
        </View>
      ) : (
        /*
          Un seul bouton, parce que suivre est un état et non deux actions.
          « Suivre » et « Ne plus suivre » côte à côte demandaient au lecteur de
          deviner lequel des deux décrivait la situation présente — et l'un des
          deux ne faisait jamais rien.

          L'état vient de la liste d'abonnés, la seule chose que le serveur
          publie à ce sujet : le profil public ne porte pas « est-ce que je le
          suis ». La liste est complète et non paginée, donc y chercher son
          propre identifiant est exact, et elle est de toute façon déjà chargée
          pour le compteur juste au-dessus.
        */
        <Button
          label={
            pendingRequest
              ? translate('profile.followPending')
              : isFollowing
                ? translate('profile.unfollow')
                : translate('profile.follow')
          }
          variant={isFollowing || pendingRequest ? 'outline' : 'solid'}
          onPress={() => {
            if (pendingRequest) return;
            if (isFollowing) unfollow.mutate(profile.id);
            else follow.mutate(profile.id);
          }}
          loading={follow.isPending || unfollow.isPending}
          disabled={pendingRequest}
          fullWidth
          testID={isFollowing ? 'profile-unfollow' : 'profile-follow'}
        />
      )}

      {/*
        L'objectif au-dessus du sélecteur, et hors du bloc qui change.

        Il vivait dedans, affiché sur la seule semaine : passer sur « Mois »
        retirait cent vingt points de hauteur d'un coup, et tout ce qui suivait
        remontait sous le doigt. Ce qui change en changeant de période ne doit
        contenir que ce qui dépend de la période — l'objectif est hebdomadaire
        par nature, sa place est au-dessus.

        `isMe` d'abord, et pas seulement « la donnée est là » : `/me/stats` ne
        répond que pour le coureur connecté, et `enabled: false` n'efface pas ce
        que React Query garde déjà sous cette clé. Sans cette garde, mon propre
        objectif s'affichait sur le profil de quelqu'un d'autre.
      */}
      {isMe && weekly.data !== undefined && <WeeklyGoal totals={weekly.data} />}

      {totals !== undefined && (
        <View style={{ gap: space.sm }}>
          {/*
            La période se choisit : un bilan figé sur la semaine ne dit rien en
            janvier d'une saison qui s'est jouée en octobre.
          */}
          <Tabs
            options={STATS_PERIODS.map((value) => ({
              value,
              label: translate(`profile.period${value}`),
            }))}
            value={period}
            onValueChange={setPeriod}
            label={translate('profile.period')}
            testID="profile-period"
          />
          {/*
            `key` sur la période : le bloc est remonté à chaque changement, donc
            `entering` rejoue. Sans elle, React réutilise les mêmes nœuds et les
            chiffres se substituent d'une image à l'autre, sans rien annoncer.
            §4 : le mouvement se réduit à un fondu quand le système le demande.
          */}
          <Animated.View key={period} entering={motion.listItemIn}>
            <Totals totals={totals} period={period} />
          </Animated.View>
        </View>
      )}

      {/*
        Les onglets d'affichage touchent la grille, sans marge : c'est ce qui les
        rattache aux courses plutôt qu'au bloc de chiffres au-dessus.
      */}
      <Tabs
        appearance="underline"
        options={[
          { value: 'grid', label: translate('profile.viewGrid'), icon: 'grid' },
          { value: 'list', label: translate('profile.viewList'), icon: 'list' },
        ]}
        value={view}
        onValueChange={setView}
        label={translate('profile.view')}
        testID="profile-view"
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="profile-screen">
      <ScreenHeader
        title={`@${profile.handle}`}
        onBack={onBack}
        backLabel={translate('common.back')}
        // Rien à modérer sur son propre profil : un menu qui ne propose que de
        // se bloquer soi-même est un menu qu'on ouvre une fois.
        action={
          isMe ? undefined : (
            <FloatingIconButton
              icon="more-horizontal"
              accessibilityLabel={translate('profile.menu')}
              onPress={() => {
                setMenuOpen(true);
              }}
              testID="profile-menu"
            />
          )
        }
        testID="profile-header"
      />
      <View
        style={{
          flex: 1,
          paddingHorizontal: space.md,
          paddingTop: space.sm,
          paddingBottom: space.md,
        }}
      >
        <List
          // Remonter la liste en changeant de disposition : sans cela FlashList
          // garde la géométrie de l'ancienne et laisse une colonne de trous.
          data={activities.isPending ? undefined : rows}
          renderItem={renderRow}
          keyExtractor={(row) => row.map((item) => item.id).join('-')}
          header={header}
          emptyTitle={translate('home.noActivities')}
          emptyDescription={
            profile.accountScope === 'PRIVATE'
              ? translate('profile.privateDetail')
              : translate('home.noActivitiesDetail')
          }
          loading={activities.isPending}
          loadingLabel={translate('common.loading')}
          onRefresh={() => {
            // Le geste recharge ce que la page montre : les courses et les
            // chiffres, pas seulement la liste.
            void activities.refetch();
            void stats.refetch();
            void lifetime.refetch();
          }}
          refreshing={activities.isRefetching}
          onEndReached={() => {
            if (activities.hasNextPage && !activities.isFetchingNextPage) {
              void activities.fetchNextPage();
            }
          }}
          testID="profile-activities"
        />
      </View>

      <Sheet
        visible={menuOpen}
        onClose={() => {
          setMenuOpen(false);
        }}
        title={profile.displayName}
        testID="profile-menu-sheet"
      >
        <GroupedRows
          rows={[
            blocked
              ? {
                  key: 'unblock',
                  label: translate('profile.unblock'),
                  description: translate('profile.unblockDetail'),
                  icon: 'eye',
                  onPress: () => {
                    unblock.mutate(profile.id);
                    setBlocked(false);
                    setMenuOpen(false);
                  },
                }
              : {
                  key: 'block',
                  label: translate('profile.block'),
                  description: translate('profile.blockDetail'),
                  icon: 'eye-off',
                  onPress: () => {
                    // La feuille se referme avant la confirmation : deux
                    // panneaux empilés, et le second n'a plus de chemin de
                    // sortie sur Android.
                    setMenuOpen(false);
                    setConfirmingBlock(true);
                  },
                },
          ]}
          testID="profile-menu-rows"
        />
      </Sheet>

      {/*
        Un blocage se confirme : il coupe le lien dans les deux sens, et rien
        dans l'écran ne dira plus qu'il est en place une fois la page quittée.
      */}
      <Modal
        visible={confirmingBlock}
        onClose={() => {
          setConfirmingBlock(false);
        }}
        title={translate('profile.blockConfirm', { name: profile.displayName })}
        confirmLabel={translate('profile.block')}
        destructive
        onConfirm={() => {
          block.mutate(profile.id);
          setBlocked(true);
          setConfirmingBlock(false);
        }}
        testID="profile-block-confirm"
      >
        <Text>{translate('profile.blockDetail')}</Text>
      </Modal>
    </View>
  );
}

/**
 * A number over its name — the unit every profile of this kind counts in.
 *
 * It is a `Pressable` only when there is somewhere to go: a followers list
 * opens, a run count does not, and a button that leads nowhere is worse than
 * plain text. Both halves are decorative, so the reader announces "128 abonnés"
 * once rather than "128" then "abonnés".
 */
/** Le plancher d'une colonne de compteur : « 0 » ne rétrécit pas sa colonne. */
const COUNT_MIN_WIDTH = 72;

function Count({
  value,
  label,
  accessibilityLabel,
  onPress,
  testID,
}: {
  value: string;
  label: string;
  accessibilityLabel: string;
  onPress?: (() => void) | undefined;
  testID: string;
}): ReactNode {
  const content = (
    <View style={{ alignItems: 'center', gap: space.xxs }}>
      <Text variant="section" decorative>
        {value}
      </Text>
      <Text variant="caption" tone="muted" decorative>
        {label}
      </Text>
    </View>
  );

  if (onPress === undefined) {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        style={{ minWidth: COUNT_MIN_WIDTH }}
        testID={testID}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{ minWidth: COUNT_MIN_WIDTH }}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

/** §9 : côté client, et pas encore réglable — l'écran de réglages viendra. */
const WEEKLY_GOAL_METRES = 40_000;

/**
 * Ce qu'il reste à courir cette semaine — la seule ligne de l'écran qui parle
 * d'un avenir, là où tout le reste compte ce qui est fait.
 */
function WeeklyGoal({ totals }: { totals: RunnerTotals }): ReactNode {
  const remaining = WEEKLY_GOAL_METRES - totals.distanceMetres;

  return (
    <View>
      {
        <Card
          tone="accent"
          // §5 : la carte se lit d'un bloc — ses textes sont décoratifs, donc
          // sans ce libellé elle ne serait plus annoncée du tout.
          accessibilityLabel={[
            translate('home.weeklyGoal'),
            translate('home.weeklyGoalProgress', {
              done: formatKilometres(totals.distanceMetres),
              goal: formatKilometres(WEEKLY_GOAL_METRES),
            }),
            remaining <= 0
              ? translate('home.weeklyGoalReached')
              : translate('home.weeklyGoalRemaining', {
                  remaining: formatKilometres(remaining),
                }),
          ].join(', ')}
          testID="profile-goal"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <ProgressRing
              progress={goalProgress(totals, WEEKLY_GOAL_METRES)}
              label={translate('home.weeklyGoal')}
              onAccent
            />
            <View style={{ flex: 1, gap: space.xxs }}>
              <Text variant="section" tone="onBrand" decorative>
                {translate('home.weeklyGoal')}
              </Text>
              <Text tone="onBrand" decorative>
                {translate('home.weeklyGoalProgress', {
                  done: formatKilometres(totals.distanceMetres),
                  goal: formatKilometres(WEEKLY_GOAL_METRES),
                })}
              </Text>
              <Text variant="caption" tone="onBrand" decorative>
                {remaining <= 0
                  ? translate('home.weeklyGoalReached')
                  : translate('home.weeklyGoalRemaining', {
                      remaining: formatKilometres(remaining),
                    })}
              </Text>
            </View>
          </View>
        </Card>
      }
    </View>
  );
}

/** Le bilan de la période choisie, et rien d'autre : quatre cartes, toujours. */
function Totals({ totals, period }: { totals: RunnerTotals; period: StatsPeriod }): ReactNode {
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title={translate(`profile.totals${period}`)} />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          rowGap: space['2xl'],
          columnGap: space.md,
        }}
      >
        <View style={{ flexGrow: 1, flexBasis: '46%' }}>
          <MetricCard
            title={translate('home.distance')}
            icon="activity"
            accent="pace"
            value={formatKilometres(totals.distanceMetres)}
            unit={translate('common.km')}
            spokenUnit={translate('common.spokenKilometres')}
            testID="profile-metric-distance"
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '46%' }}>
          <MetricCard
            title={translate('home.averagePace')}
            icon="trending-up"
            accent="pace"
            value={formatPace(averagePaceOf(totals.distanceMetres, totals.movingTimeSeconds))}
            unit={translate('common.perKm')}
            spokenValue={spokenPace(averagePaceOf(totals.distanceMetres, totals.movingTimeSeconds))}
            testID="profile-metric-pace"
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '46%' }}>
          <MetricCard
            title={translate('home.elevation')}
            icon="mountain"
            accent="climb"
            value={formatWhole(totals.elevationGain)}
            unit={translate('common.metres')}
            spokenUnit={translate('common.spokenMetres')}
            testID="profile-metric-elevation"
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '46%' }}>
          <MetricCard
            title={translate('home.outings')}
            icon="calendar"
            accent="count"
            value={formatWhole(totals.activityCount)}
            unit={translate(totals.activityCount === 1 ? 'home.outingUnit' : 'home.outingsUnit')}
            testID="profile-metric-outings"
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Les totaux d'une période portent une distance et un temps, pas une allure —
 * le serveur la calcule par course, pas par période. `paceOver` appartient à
 * l'hexagone, pour que deux écrans ne puissent pas être en désaccord sur ce
 * qu'est une allure moyenne.
 */
function averagePaceOf(distanceMetres: number, movingTimeSeconds: number): number | undefined {
  return paceOver(distanceMetres, movingTimeSeconds);
}
