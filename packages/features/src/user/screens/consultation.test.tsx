import { RunTrackError, activityId, userId } from '@runtrack/core';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { aProfile, anActivity, totals } from '../../testing/fakes';
import { aRuntime, renderWithRuntime } from '../../testing/harness';
import { ActivityScreen } from '../../activity/screens/ActivityScreen';
import { HomeScreen } from './HomeScreen';
import { ProfileScreen } from './ProfileScreen';

const noop = (): void => undefined;

const home = (props: Partial<Parameters<typeof HomeScreen>[0]> = {}) => (
  <HomeScreen
    onOpenNotifications={noop}
    onOpenProfile={noop}
    onOpenFeed={noop}
    onOpenActivity={noop}
    {...props}
  />
);

describe('HomeScreen', () => {
  it('salue par le nom et annonce l’objectif d’une phrase', async () => {
    const harness = aRuntime();
    await renderWithRuntime(home(), harness);

    expect(await screen.findByText('Bonjour Thomas')).toBeOnTheScreen();
    // §5 : « Objectif de la semaine, 68 % » et non un nombre isolé.
    expect(
      screen.getByRole('progressbar', { name: 'Objectif de la semaine, 68 %' }),
    ).toBeOnTheScreen();
  });

  it('borne un objectif dépassé plutôt que de dessiner deux tours', async () => {
    const harness = aRuntime();
    harness.users.stat = totals({ distanceMetres: 56_000 });
    await renderWithRuntime(home(), harness);

    expect(
      await screen.findByRole('progressbar', { name: 'Objectif de la semaine, 100 %' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Objectif atteint')).toBeOnTheScreen();
  });

  it('lit chaque métrique d’un bloc, unité prononcée', async () => {
    const harness = aRuntime();
    await renderWithRuntime(home(), harness);

    expect(await screen.findByLabelText('Distance, 27,2 kilomètres')).toBeOnTheScreen();
    expect(screen.getByLabelText('Dénivelé, 412 mètres')).toBeOnTheScreen();
    // L'allure n'est pas dans le bilan : elle se déduit de la distance et du
    // temps en mouvement, par la fonction du domaine.
    expect(screen.getByLabelText('Allure moyenne, 5 minutes 8 par kilomètre')).toBeOnTheScreen();
  });

  it('n’affiche pas « 0:00 » quand aucune allure n’est mesurable', async () => {
    const harness = aRuntime();
    harness.users.stat = totals({ distanceMetres: 0, movingTimeSeconds: 0, activityCount: 0 });
    await renderWithRuntime(home(), harness);

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

  it('grise le suivi en direct sur une course terminée', async () => {
    const harness = aRuntime();
    await renderWithRuntime(activity(), harness);

    expect(await screen.findByRole('button', { name: 'En direct' })).toBeDisabled();
  });

  it('ne charge les kilomètres que lorsqu’on les demande', async () => {
    // Une course finie en a un par kilomètre, et personne ne les lit depuis le
    // fil : les charger d'office serait une requête pour rien à chaque ouverture.
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
    expect(splitCalls).toBe(0);

    await userEvent.press(screen.getByTestId('activity-splits-toggle'));

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
    expect(alert.props['accessibilityLabel']).toContain('Elle n’est pas partagée avec vous');
    expect(screen.getByText('Référence : c-3', { includeHiddenElements: true })).toBeOnTheScreen();
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
