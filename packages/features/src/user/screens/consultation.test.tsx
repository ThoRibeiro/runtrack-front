import { RunTrackError, activityId, userId } from '@runtrack/core';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { aFeedItem, aProfile, anActivity, totals } from '../../testing/fakes';
import { aRuntime, renderWithRuntime } from '../../testing/harness';
import { ActivityScreen } from '../../activity/screens/ActivityScreen';
import { HomeScreen } from './HomeScreen';
import { ProfileScreen } from './ProfileScreen';

const noop = (): void => undefined;

const home = (props: Partial<Parameters<typeof HomeScreen>[0]> = {}) => (
  <HomeScreen
    onOpenNotifications={noop}
    onOpenProfile={noop}
    onOpenActivity={noop}
    {...props}
  />
);

describe('HomeScreen', () => {
  it('salue par le nom, et laisse la place aux courses', async () => {
    const harness = aRuntime();
    await renderWithRuntime(home(), harness);

    expect(await screen.findByText('Bonjour Thomas')).toBeOnTheScreen();
    // L'objectif et les chiffres sont sur le profil : en tête du fil, ils
    // repoussaient les courses des autres sous la ligne de flottaison.
    expect(screen.queryByTestId('profile-goal')).toBeNull();
  });

  it('annonce l’objectif d’une phrase, sur le profil', async () => {
    const harness = aRuntime();
    await renderWithRuntime(
      <ProfileScreen
        handle="thomas"
        isMe
        onOpenActivity={noop}
        onOpenFollowers={noop}
        onOpenFollowing={noop}
      />,
      harness,
    );

    // §5 : « Objectif de la semaine, 68 % » et non un nombre isolé.
    expect(
      await screen.findByRole('progressbar', { name: 'Objectif de la semaine, 68 %' }),
    ).toBeOnTheScreen();
  });

  it('montre les indicateurs de la semaine sur son profil, pas sur l’accueil', async () => {
    const harness = aRuntime();
    harness.users.stat = totals({ distanceMetres: 27_200, activityCount: 3, elevationGain: 284 });
    await renderWithRuntime(
      <ProfileScreen
        handle="thomas"
        isMe
        onOpenActivity={noop}
        onOpenFollowers={noop}
        onOpenFollowing={noop}
      />,
      harness,
    );

    // Ils parlent du coureur, pas du fil : en tête de l'accueil, ils
    // repoussaient les courses des autres sous la ligne de flottaison.
    expect(await screen.findByTestId('profile-metric-distance')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-metric-pace')).toBeOnTheScreen();
  });

  it('ne montre pas ces chiffres sur le profil de quelqu’un d’autre', async () => {
    const harness = aRuntime();
    await renderWithRuntime(
      <ProfileScreen
        handle="camille"
        isMe={false}
        onOpenActivity={noop}
        onOpenFollowers={noop}
        onOpenFollowing={noop}
      />,
      harness,
    );

    await screen.findByTestId('profile-screen');
    // Le serveur ne publie ces totaux que pour soi.
    expect(screen.queryByTestId('profile-metric-distance')).toBeNull();
  });

  it('borne un objectif dépassé plutôt que de dessiner deux tours', async () => {
    const harness = aRuntime();
    harness.users.stat = totals({ distanceMetres: 56_000 });
    await renderWithRuntime(
      <ProfileScreen
        handle="thomas"
        isMe
        onOpenActivity={noop}
        onOpenFollowers={noop}
        onOpenFollowing={noop}
      />,
      harness,
    );

    expect(
      await screen.findByRole('progressbar', { name: 'Objectif de la semaine, 100 %' }),
    ).toBeOnTheScreen();
    // La carte s'annonce d'un bloc : c'est son libellé qui porte l'information.
    expect(screen.getByLabelText(/Objectif atteint/)).toBeOnTheScreen();
  });

  it('lit chaque métrique d’un bloc, unité prononcée', async () => {
    const harness = aRuntime();
    await renderWithRuntime(
      <ProfileScreen
        handle="thomas"
        isMe
        onOpenActivity={noop}
        onOpenFollowers={noop}
        onOpenFollowing={noop}
      />,
      harness,
    );

    expect(await screen.findByLabelText('Distance, 27,2 kilomètres')).toBeOnTheScreen();
    expect(screen.getByLabelText('Dénivelé, 412 mètres')).toBeOnTheScreen();
    // L'allure n'est pas dans le bilan : elle se déduit de la distance et du
    // temps en mouvement, par la fonction du domaine.
    expect(screen.getByLabelText('Allure moyenne, 5 minutes 8 par kilomètre')).toBeOnTheScreen();
  });

  it('n’affiche pas « 0:00 » quand aucune allure n’est mesurable', async () => {
    const harness = aRuntime();
    harness.users.stat = totals({ distanceMetres: 0, movingTimeSeconds: 0, activityCount: 0 });
    await renderWithRuntime(
      <ProfileScreen
        handle="thomas"
        isMe
        onOpenActivity={noop}
        onOpenFollowers={noop}
        onOpenFollowing={noop}
      />,
      harness,
    );

    expect(await screen.findByLabelText('Allure moyenne, allure inconnue')).toBeOnTheScreen();
  });
});

describe('ActivityScreen', () => {
  const activity = (props: Partial<Parameters<typeof ActivityScreen>[0]> = {}) => (
    <ActivityScreen id={activityId('a1')} onBack={noop} onFollowLive={noop} {...props} />
  );

  it('montre les statistiques de la course, chacune nommée', async () => {
    const harness = aRuntime();
    await renderWithRuntime(activity(), harness);

    expect(await screen.findByLabelText('Distance, 12,4 kilomètres')).toBeOnTheScreen();
    expect(screen.getByLabelText('Durée, 1 heure 4 minutes 22 secondes')).toBeOnTheScreen();
    expect(screen.getByLabelText('Allure, 5 minutes 0 par kilomètre')).toBeOnTheScreen();
  });

  it('propose de supprimer sa propre course, après confirmation', async () => {
    const harness = aRuntime();
    // La course appartient au coureur connecté : `myProfile` et `anActivity`
    // partagent l'identifiant `u-42`.
    harness.activities.activity = anActivity({ ownerId: harness.users.profile.id });
    const deleted = jest.fn();
    await renderWithRuntime(activity({ onDeleted: deleted }), harness);

    await userEvent.press(await screen.findByTestId('activity-menu'));
    await userEvent.press(await screen.findByTestId('activity-delete'));
    await userEvent.press(await screen.findByTestId('activity-delete-confirm-confirm'));

    await waitFor(() => {
      expect(harness.activities.deleted).toHaveLength(1);
    });
    expect(deleted).toHaveBeenCalled();
  });

  it('ne propose rien sur la course de quelqu’un d’autre', async () => {
    const harness = aRuntime();
    harness.activities.activity = anActivity({ ownerId: userId('u-99') });
    await renderWithRuntime(activity(), harness);

    await screen.findByTestId('activity-screen');
    // Un bouton qui ouvre un panneau vide est pire que pas de bouton.
    expect(screen.queryByTestId('activity-menu')).toBeNull();
  });

  it('ne propose pas le direct sur une course terminée', async () => {
    const harness = aRuntime();
    await renderWithRuntime(activity(), harness);

    await screen.findByTestId('activity-screen');
    // Un bouton grisé occupait la place et faisait douter des autres : sur une
    // sortie finie, il n'y a rien à suivre.
    expect(screen.queryByTestId('activity-follow-live')).toBeNull();
  });

  it('ne dit pas « purgée » d’une course qui vient de commencer', async () => {
    const harness = aRuntime();
    harness.activities.activity = anActivity({
      status: { kind: 'live', since: 1_700_000_000_000 },
      endedAt: undefined,
    });
    // Le serveur répond « pas encore historisée » : c'est normal, elle court.
    harness.activities.onTrack = () =>
      Promise.reject(
        new RunTrackError({ code: 'TRACK_NOT_ARCHIVED', message: 'pas encore', status: 404 }),
      );
    await renderWithRuntime(activity(), harness);

    await screen.findByTestId('activity-screen');
    // Le message d'avant parlait de points purgés au bout de 90 jours, sur une
    // course commencée il y a deux minutes.
    expect(screen.queryByText(/purgés/)).toBeNull();
  });

  it('affiche les kilomètres avec l’écran, sans les déplier', async () => {
    // On ouvre une course pour la lire : ses tronçons font partie de ce qu'on
    // vient voir, pas d'un tiroir à ouvrir.
    const harness = aRuntime();
    let splitCalls = 0;
    harness.activities.splits = () => {
      splitCalls += 1;
      return Promise.resolve([
        {
          // Le serveur numérote à partir de 1 — voir `SplitCalculator`.
          kilometreIndex: 1,
          distanceMetres: 1000,
          timeSeconds: 300,
          paceSecondsPerKm: 300,
          elevationGain: 12,
          averageHeartRate: undefined,
          complete: true,
        },
      ]);
    };

    await renderWithRuntime(activity(), harness);
    await screen.findByTestId('activity-screen');

    await waitFor(() => {
      expect(splitCalls).toBe(1);
    });
    expect(screen.getByLabelText('Kilomètre 1, 5:00')).toBeOnTheScreen();
  });

  it('dit ce qui manque quand la course est introuvable', async () => {
    const harness = aRuntime();
    harness.activities.onById = () =>
      Promise.reject(
        new RunTrackError({
          code: 'ACTIVITY_NOT_VISIBLE',
          message: 'Elle n’est pas partagée avec vous',
          correlationId: 'c-3',
        }),
      );
    await renderWithRuntime(activity(), harness);

    const alert = await screen.findByRole('alert');
    expect(alert.props['accessibilityLabel']).toContain('Cette course n’est pas partagée avec vous');
    expect(screen.queryByText(/Référence/, { includeHiddenElements: true })).not.toBeOnTheScreen();
  });
});

describe('l’accueil est le fil', () => {
  it('déroule les courses des gens suivis, pas seulement trois', async () => {
    const harness = aRuntime();
    harness.feed.pages = [
      {
        items: [
          aFeedItem({ activityId: activityId('a1'), title: 'Sortie du matin' }),
          aFeedItem({ activityId: activityId('a2'), title: 'Fractionné' }),
          aFeedItem({ activityId: activityId('a3'), title: 'Sortie longue' }),
          aFeedItem({ activityId: activityId('a4'), title: 'Récupération' }),
        ],
      },
    ];
    await renderWithRuntime(home(), harness);

    // Le doublon d'hier : un accueil qui montrait trois courses et un onglet
    // « Fil » qui les montrait toutes. Il n'y a plus qu'un endroit.
    expect(await screen.findByTestId('feed-card-a4')).toBeOnTheScreen();
    expect(screen.getByText('Bonjour Thomas')).toBeOnTheScreen();
  });

  it('dessine le parcours sur la carte, quand la course en a un', async () => {
    const harness = aRuntime();
    harness.feed.pages = [
      {
        items: [
          aFeedItem({
            activityId: activityId('a1'),
            previewPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          }),
        ],
      },
    ];
    await renderWithRuntime(home(), harness);

    expect(await screen.findByTestId('feed-track-a1')).toBeOnTheScreen();
  });

  it('dit ce que le serveur a refusé, plutôt qu’une liste vide', async () => {
    const harness = aRuntime();
    harness.feed.read = () =>
      Promise.reject(new RunTrackError({ code: 'BLOCKED', message: 'refus', status: 403 }));
    await renderWithRuntime(home(), harness);

    const alert = await screen.findByRole('alert');
    expect(alert.props['accessibilityLabel']).toContain('Un blocage empêche cette action');
  });
});

describe('ProfileScreen', () => {
  const profile = (props: Partial<Parameters<typeof ProfileScreen>[0]> = {}) => (
    <ProfileScreen
      handle="camille"
      isMe={false}
      onOpenActivity={noop}
      onOpenFollowers={noop}
      onOpenFollowing={noop}
      {...props}
    />
  );

  it('montre les compteurs que le serveur envoie', async () => {
    const harness = aRuntime();
    harness.social.followerList = { userIds: [], count: 128 };
    harness.social.followingList = { userIds: [], count: 42 };
    await renderWithRuntime(profile(), harness);

    expect(await screen.findByRole('button', { name: '128 abonnés' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '42 abonnements' })).toBeOnTheScreen();
  });

  it('suit un coureur et signale une demande en attente', async () => {
    const harness = aRuntime();
    harness.social.nextFollowStatus = 'PENDING';
    await renderWithRuntime(profile(), harness);

    await userEvent.press(await screen.findByTestId('profile-follow'));

    await waitFor(() => {
      expect(harness.social.followed).toEqual([userId('u-7')]);
    });
    expect(await screen.findByRole('button', { name: 'Demande envoyée' })).toBeOnTheScreen();
  });

  it('propose la déconnexion sur son propre profil, jamais « se suivre »', async () => {
    const harness = aRuntime();
    const onSignOut = jest.fn();
    await renderWithRuntime(profile({ isMe: true, onSignOut }), harness);

    await userEvent.press(await screen.findByTestId('profile-sign-out'));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('profile-follow')).not.toBeOnTheScreen();
  });

  it('explique un compte privé plutôt que d’afficher une liste vide muette', async () => {
    const harness = aRuntime();
    harness.social.profile = aProfile({ accountScope: 'PRIVATE' });
    harness.activities.activities = { items: [] };
    await renderWithRuntime(profile(), harness);

    expect(await screen.findByLabelText(/visibles par ses abonnés/)).toBeOnTheScreen();
  });

  it('ouvre une course de la liste', async () => {
    const harness = aRuntime();
    harness.activities.activities = { items: [anActivity()] };
    const onOpenActivity = jest.fn();
    await renderWithRuntime(profile({ onOpenActivity }), harness);

    await userEvent.press(await screen.findByTestId('profile-activity-a1'));

    expect(onOpenActivity).toHaveBeenCalledWith(activityId('a1'));
  });
});
