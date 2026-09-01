import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { activityId, commentId, shareLinkId } from '@runtrack/core';
import { aComment } from '../testing/fakes';
import { aRuntime, renderWithRuntime, aSession, type Harness } from '../testing/harness';
import { ActivityScreen } from '../activity/screens/ActivityScreen';
import { SharedActivityScreen } from './screens/SharedActivityScreen';

const noop = (): void => undefined;
const RUN = activityId('a1');

function signedIn(): Harness {
  return aRuntime({ session: aSession() });
}

const activityScreen = (props: { onCopyLink?: (url: string) => void } = {}) => (
  <ActivityScreen id={RUN} onBack={noop} onFollowLive={noop} {...props} />
);

describe('les j’aime', () => {
  it('dit s’il est aimé autrement que par la couleur du cœur', async () => {
    const harness = signedIn();
    await renderWithRuntime(activityScreen(), harness);

    // §15 : l'état est dans le nom accessible, pas seulement dans le remplissage.
    expect(await screen.findByLabelText('Aimer, 2 j’aime')).toBeOnTheScreen();
  });

  it('aime, et se pose sur ce que le serveur répond', async () => {
    const harness = signedIn();
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByLabelText('Aimer, 2 j’aime');

    await userEvent.press(screen.getByTestId('activity-like'));

    expect(await screen.findByLabelText('Aimé, 3 j’aime')).toBeOnTheScreen();
  });

  it('retire son j’aime', async () => {
    const harness = signedIn();
    harness.engagement.likeState = { total: 5, likedByViewer: true, recentUserIds: [] };
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByLabelText('Aimé, 5 j’aime');

    await userEvent.press(screen.getByTestId('activity-like'));

    expect(await screen.findByLabelText('Aimer, 4 j’aime')).toBeOnTheScreen();
  });

  it('accorde le singulier', async () => {
    const harness = signedIn();
    harness.engagement.likeState = { total: 1, likedByViewer: false, recentUserIds: [] };
    await renderWithRuntime(activityScreen(), harness);

    expect(await screen.findByLabelText('Aimer, 1 j’aime')).toBeOnTheScreen();
  });
});

describe('les commentaires', () => {
  it('ne charge le fil qu’à l’ouverture de la section', async () => {
    const harness = signedIn();
    let calls = 0;
    harness.engagement.comments = () => {
      calls += 1;
      return Promise.resolve(harness.engagement.thread);
    };
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');

    expect(calls).toBe(0);

    await userEvent.press(screen.getByTestId('activity-comments-toggle'));

    await waitFor(() => {
      expect(calls).toBe(1);
    });
  });

  it('lit un commentaire d’un bloc : qui, quoi, quand', async () => {
    const harness = signedIn();
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');

    await userEvent.press(screen.getByTestId('activity-comments-toggle'));

    expect(await screen.findByLabelText(/Un coureur, Belle sortie/)).toBeOnTheScreen();
  });

  it('publie un commentaire et vide le champ', async () => {
    const harness = signedIn();
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');
    await userEvent.press(screen.getByTestId('activity-comments-toggle'));
    await screen.findByTestId('comment-draft');

    await userEvent.type(screen.getByTestId('comment-draft'), 'Bravo');
    await userEvent.press(screen.getByTestId('comment-post'));

    await waitFor(() => {
      expect(harness.engagement.posted).toEqual([{ body: 'Bravo', parentId: undefined }]);
    });
  });

  it('refuse de publier un commentaire vide', async () => {
    const harness = signedIn();
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');
    await userEvent.press(screen.getByTestId('activity-comments-toggle'));

    expect(await screen.findByTestId('comment-post')).toBeDisabled();
  });

  it('garde sa place à un commentaire supprimé, sans son texte', async () => {
    const harness = signedIn();
    harness.engagement.thread = { items: [aComment({ deleted: true, body: '' })] };
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');

    await userEvent.press(screen.getByTestId('activity-comments-toggle'));

    expect(await screen.findByLabelText('Commentaire supprimé')).toBeOnTheScreen();
  });

  it('supprime un commentaire', async () => {
    const harness = signedIn();
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');
    await userEvent.press(screen.getByTestId('activity-comments-toggle'));
    await screen.findByTestId('comment-c1');

    await userEvent.press(screen.getByTestId('comment-delete-c1'));

    await waitFor(() => {
      expect(harness.engagement.deleted).toEqual([commentId('c1')]);
    });
  });
});

describe('le partage', () => {
  it('dit ce qu’un lien fait avant d’en créer un', async () => {
    const harness = signedIn();
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');

    await userEvent.press(screen.getByTestId('activity-share'));

    expect(await screen.findByText(/Quiconque l’a peut la voir/)).toBeOnTheScreen();
  });

  it('crée un lien et prévient qu’il ne s’affichera qu’une fois', async () => {
    const harness = signedIn();
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');
    await userEvent.press(screen.getByTestId('activity-share'));

    await userEvent.press(await screen.findByTestId('share-create'));

    // Le jeton en clair n'existe qu'à la création : l'écran le dit là où ça
    // compte, pas dans une documentation que personne ne lit.
    expect(await screen.findByText(/ne s’affiche qu’une fois/)).toBeOnTheScreen();
  });

  it('donne l’URL complète à copier', async () => {
    const harness = signedIn();
    const copied: string[] = [];
    await renderWithRuntime(activityScreen({ onCopyLink: (url) => copied.push(url) }), harness);
    await screen.findByTestId('activity-screen');
    await userEvent.press(screen.getByTestId('activity-share'));
    await userEvent.press(await screen.findByTestId('share-create'));

    await userEvent.press(await screen.findByTestId('share-copy'));

    expect(copied).toEqual(['https://api.test/shared/v1/jeton-clair']);
  });

  it('révoque un lien existant', async () => {
    const harness = signedIn();
    harness.sharing.links = [
      {
        id: shareLinkId('s1'),
        token: '',
        url: '/shared/v1/x',
        createdAt: 1_700_000_000_000,
        expiresAt: undefined,
        revokedAt: undefined,
        viewCount: 3,
      },
    ];
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');
    await userEvent.press(screen.getByTestId('activity-share'));

    await userEvent.press(await screen.findByLabelText(/3 ouverture/));

    await waitFor(() => {
      expect(harness.sharing.revoked).toHaveLength(1);
    });
  });
});

describe('la page publique', () => {
  it('dit la même chose pour un lien révoqué, expiré ou inventé', async () => {
    const harness = aRuntime();

    await renderWithRuntime(<SharedActivityScreen token="jeton" />, harness);

    // Le serveur répond la même chose aux trois : distinguer confirmerait à qui
    // tâtonne qu'un jeton, lui, a existé.
    expect(await screen.findByLabelText(/Ce lien n’est plus valable/)).toBeOnTheScreen();
  });
});
