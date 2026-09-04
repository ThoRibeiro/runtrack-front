import { RunTrackError } from '@runtrack/core';
import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { myProfile } from '../../testing/fakes';
import { aRuntime, renderWithRuntime, type Harness } from '../../testing/harness';
import { EditProfileScreen } from './EditProfileScreen';

const noop = (): void => undefined;

/**
 * Le poids et la taille se règlent au curseur : il n'y a plus de texte à taper.
 *
 * L'action d'accessibilité est la seule prise qu'un test ait dessus, et c'est
 * heureux — c'est aussi celle dont se sert un lecteur d'écran, donc l'éprouver
 * ici vérifie les deux d'un coup.
 */
async function nudge(testID: string, direction: 'increment' | 'decrement'): Promise<void> {
  await fireEvent(screen.getByTestId(testID), 'accessibilityAction', {
    nativeEvent: { actionName: direction },
  });
}

async function openEdition(harness: Harness): Promise<void> {
  await renderWithRuntime(<EditProfileScreen onSaved={noop} onBack={noop} />, harness);
  await screen.findByTestId('edit-profile-screen');
}

describe('EditProfileScreen', () => {
  it('ouvre le formulaire sur ce que le serveur sait déjà', async () => {
    const harness = aRuntime();
    harness.users.profile = myProfile({ displayName: 'Thomas', bio: 'Coureur du dimanche' });
    harness.users.body = {
      birthDate: '1998-03-04',
      biologicalSex: 'MALE',
      weightKilograms: 72,
      heightCentimetres: 178,
    };

    await openEdition(harness);

    expect(screen.getByTestId('edit-bio').props['value']).toBe('Coureur du dimanche');
    // La valeur se lit à côté du curseur, en toutes lettres : un curseur seul
    // ne dit pas ce qu'il vaut.
    expect(screen.getByText('72 kg', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('178 cm', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('n’envoie que ce qui a changé', async () => {
    const harness = aRuntime();
    const updateProfile = jest.fn(() => Promise.resolve(harness.users.profile));
    const changeHandle = jest.fn(() => Promise.resolve(harness.users.profile));
    harness.users.onUpdateProfile = updateProfile;
    harness.users.onChangeHandle = changeHandle;
    await openEdition(harness);

    await nudge('edit-weight', 'decrement');
    await userEvent.press(screen.getByTestId('edit-profile-save'));

    await waitFor(() => {
      expect(harness.users.body.weightKilograms).toBe(69);
    });
    // Le pseudonyme n'a pas bougé : le renommer le ferait vérifier contre
    // lui-même, et le serveur refuserait un nom déjà pris — le sien.
    expect(changeHandle).not.toHaveBeenCalled();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('enregistre nom, bio et physiologie ensemble', async () => {
    const harness = aRuntime();
    const saved = jest.fn();
    await renderWithRuntime(<EditProfileScreen onSaved={saved} onBack={noop} />, harness);
    await screen.findByTestId('edit-profile-screen');

    await userEvent.clear(screen.getByTestId('edit-bio'));
    await userEvent.type(screen.getByTestId('edit-bio'), 'Marathon en octobre');
    await nudge('edit-height', 'increment');
    await userEvent.press(screen.getByTestId('edit-profile-save'));

    await waitFor(() => {
      expect(saved).toHaveBeenCalled();
    });
    expect(harness.users.profile.bio).toBe('Marathon en octobre');
    expect(harness.users.body.heightCentimetres).toBe(176);
  });

  it('envoie la photo choisie dès qu’elle est choisie', async () => {
    const harness = aRuntime();
    harness.imagePicker.next = {
      uri: 'file:///tmp/moi.jpg',
      name: 'moi.jpg',
      mimeType: 'image/jpeg',
    };
    await openEdition(harness);

    await userEvent.press(screen.getByTestId('edit-avatar'));

    // Elle part sans attendre « Enregistrer » : c'est son propre endpoint, et
    // un fichier déjà choisi n'a pas à se perdre si l'écran est quitté.
    await waitFor(() => {
      expect(harness.users.uploaded).toHaveLength(1);
    });
    expect(harness.users.uploaded[0]?.name).toBe('moi.jpg');
  });

  it('ne se plaint de rien quand la galerie est refermée sans choisir', async () => {
    const harness = aRuntime();
    harness.imagePicker.next = undefined;
    await openEdition(harness);

    await userEvent.press(screen.getByTestId('edit-avatar'));

    expect(harness.imagePicker.picks).toBe(1);
    expect(harness.users.uploaded).toHaveLength(0);
    expect(screen.queryByTestId('edit-avatar-error')).toBeNull();
  });

  it('dit ce qui a coincé quand l’envoi échoue', async () => {
    const harness = aRuntime();
    harness.imagePicker.next = { uri: 'file:///tmp/x.png', name: 'x.png', mimeType: 'image/png' };
    harness.users.onUploadAvatar = () =>
      Promise.reject(
        new RunTrackError({ code: 'INVALID_VALUE', message: 'trop grande', status: 400 }),
      );
    await openEdition(harness);

    await userEvent.press(screen.getByTestId('edit-avatar'));

    expect(await screen.findByTestId('edit-avatar-error')).toBeOnTheScreen();
  });

  it('retire la photo sans passer par « Enregistrer »', async () => {
    const harness = aRuntime();
    harness.users.profile = myProfile({ avatarUrl: 'https://exemple.fr/moi.jpg' });
    await openEdition(harness);

    await userEvent.press(await screen.findByTestId('edit-avatar-remove'));

    await waitFor(() => {
      expect(harness.users.profile.avatarUrl).toBeUndefined();
    });
  });

  it('ne laisse plus produire un poids que le serveur rejetterait', async () => {
    const harness = aRuntime();
    await openEdition(harness);

    // Le champ de saisie d'avant acceptait « 900 » et se faisait refuser à
    // l'envoi. Un curseur borné rend l'erreur impossible à produire, et ce sont
    // ces bornes-là qu'un lecteur d'écran annonce aussi.
    expect(screen.getByTestId('edit-weight').props['accessibilityValue']).toMatchObject({
      min: 30,
      max: 200,
    });
    expect(screen.getByTestId('edit-height').props['accessibilityValue']).toMatchObject({
      min: 100,
      max: 230,
    });
  });

  it('dit ce que le serveur a refusé, et garde ce qui a été tapé', async () => {
    const harness = aRuntime();
    harness.users.onChangeHandle = () =>
      Promise.reject(
        new RunTrackError({ code: 'HANDLE_TAKEN', message: 'déjà pris', status: 409 }),
      );
    await openEdition(harness);

    await userEvent.clear(screen.getByTestId('edit-handle'));
    await userEvent.type(screen.getByTestId('edit-handle'), 'camille');
    await userEvent.press(screen.getByTestId('edit-profile-save'));

    expect(await screen.findByTestId('edit-profile-failure')).toBeOnTheScreen();
    expect(
      screen.getByText('Ce pseudonyme est déjà pris', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('edit-handle').props['value']).toBe('camille');
  });
});
