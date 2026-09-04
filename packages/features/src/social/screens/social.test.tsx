import { userId } from '@runtrack/core';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { aProfile } from '../../testing/fakes';
import { aRuntime, renderWithRuntime } from '../../testing/harness';
import { FollowListScreen } from './FollowListScreen';
import { FollowRequestsScreen } from './FollowRequestsScreen';
import { SocialScreen } from './SocialScreen';

const noop = (): void => undefined;

describe('SocialScreen', () => {
  it('n’interroge pas le serveur sur un caractère', async () => {
    // Deux caractères correspondent à la moitié des comptes : la requête ne
    // vaut pas la peine d'être envoyée.
    const harness = aRuntime();
    await renderWithRuntime(<SocialScreen onOpenProfile={noop} onOpenRequests={noop} />, harness);

    await userEvent.type(screen.getByTestId('search-input'), 'c');

    await waitFor(() => {
      expect(harness.social.searches).toHaveLength(0);
    });
  });

  it('cherche dès deux caractères et montre les résultats', async () => {
    const harness = aRuntime();
    harness.social.results = [aProfile({ handle: 'camille', displayName: 'Camille' })];
    await renderWithRuntime(<SocialScreen onOpenProfile={noop} onOpenRequests={noop} />, harness);

    await userEvent.type(screen.getByTestId('search-input'), 'ca');

    expect(await screen.findByLabelText('Camille, @camille')).toBeOnTheScreen();
  });

  it('ouvre le profil qu’on touche', async () => {
    const harness = aRuntime();
    harness.social.results = [aProfile({ handle: 'camille' })];
    const onOpenProfile = jest.fn();
    await renderWithRuntime(
      <SocialScreen onOpenProfile={onOpenProfile} onOpenRequests={noop} />,
      harness,
    );

    await userEvent.type(screen.getByTestId('search-input'), 'ca');
    await userEvent.press(await screen.findByTestId('search-result-camille'));

    expect(onOpenProfile).toHaveBeenCalledWith('camille');
  });

  it('dit qu’il n’y a rien plutôt que de laisser une page blanche', async () => {
    const harness = aRuntime();
    harness.social.results = [];
    await renderWithRuntime(<SocialScreen onOpenProfile={noop} onOpenRequests={noop} />, harness);

    await userEvent.type(screen.getByTestId('search-input'), 'zzz');

    expect(await screen.findByLabelText(/Aucun résultat/)).toBeOnTheScreen();
  });
});

describe('FollowRequestsScreen', () => {
  it('accepte une demande', async () => {
    const harness = aRuntime();
    harness.social.requests = [
      { requestId: 'r1', followerId: userId('u-9'), requestedAt: 1_700_000_000_000 },
    ];
    await renderWithRuntime(<FollowRequestsScreen />, harness);

    await userEvent.press(await screen.findByTestId('request-accept-u-9'));

    await waitFor(() => {
      expect(harness.social.answered).toEqual([{ id: userId('u-9'), accept: true }]);
    });
  });

  it('refuse une demande', async () => {
    const harness = aRuntime();
    harness.social.requests = [
      { requestId: 'r1', followerId: userId('u-9'), requestedAt: 1_700_000_000_000 },
    ];
    await renderWithRuntime(<FollowRequestsScreen />, harness);

    await userEvent.press(await screen.findByTestId('request-reject-u-9'));

    await waitFor(() => {
      expect(harness.social.answered).toEqual([{ id: userId('u-9'), accept: false }]);
    });
  });

  it('dit qu’il n’y a rien en attente', async () => {
    const harness = aRuntime();
    await renderWithRuntime(<FollowRequestsScreen />, harness);

    expect(await screen.findByLabelText(/Aucune demande en attente/)).toBeOnTheScreen();
  });
});

describe('FollowListScreen', () => {
  it('donne le compte exact et dit pourquoi la liste manque', async () => {
    // Le serveur rend des identifiants sans pseudonyme, et aucun endpoint ne
    // résout un identifiant en profil. Le nombre est juste ; les noms attendent
    // une évolution de l'API, et l'écran le dit au lieu de faire semblant.
    const harness = aRuntime();
    harness.social.followerList = { userIds: [userId('u-1')], count: 128 };
    await renderWithRuntime(<FollowListScreen userId={userId('u-7')} kind="followers" />, harness);

    expect(await screen.findByText('128 abonnés')).toBeOnTheScreen();
    expect(screen.getByLabelText(/identifiants sans pseudonyme/)).toBeOnTheScreen();
  });

  it('sait aussi montrer les abonnements', async () => {
    const harness = aRuntime();
    harness.social.followingList = { userIds: [], count: 42 };
    await renderWithRuntime(<FollowListScreen userId={userId('u-7')} kind="following" />, harness);

    expect(await screen.findByText('42 suivis')).toBeOnTheScreen();
  });
});
