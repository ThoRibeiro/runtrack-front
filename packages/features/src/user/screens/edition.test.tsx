import { RunTrackError } from '@runtrack/core';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { myProfile } from '../../testing/fakes';
import { aRuntime, renderWithRuntime, type Harness } from '../../testing/harness';
import { EditProfileScreen } from './EditProfileScreen';

const noop = (): void => undefined;

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
    expect(screen.getByTestId('edit-weight').props['value']).toBe('72');
    expect(screen.getByTestId('edit-height').props['value']).toBe('178');
  });

  it('n’envoie que ce qui a changé', async () => {
    const harness = aRuntime();
    const updateProfile = jest.fn(() => Promise.resolve(harness.users.profile));
    const changeHandle = jest.fn(() => Promise.resolve(harness.users.profile));
    harness.users.onUpdateProfile = updateProfile;
    harness.users.onChangeHandle = changeHandle;
    await openEdition(harness);

    await userEvent.clear(screen.getByTestId('edit-weight'));
    await userEvent.type(screen.getByTestId('edit-weight'), '68');
    await userEvent.press(screen.getByTestId('edit-profile-save'));

    await waitFor(() => {
      expect(harness.users.body.weightKilograms).toBe(68);
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
    await userEvent.clear(screen.getByTestId('edit-height'));
    await userEvent.type(screen.getByTestId('edit-height'), '181');
    await userEvent.press(screen.getByTestId('edit-profile-save'));

    await waitFor(() => {
      expect(saved).toHaveBeenCalled();
    });
    expect(harness.users.profile.bio).toBe('Marathon en octobre');
    expect(harness.users.body.heightCentimetres).toBe(181);
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

  it('refuse un poids que le serveur rejetterait, sans faire l’aller-retour', async () => {
    const harness = aRuntime();
    const updatePhysiology = jest.fn(() => Promise.resolve(harness.users.body));
    harness.users.onUpdatePhysiology = updatePhysiology;
    await openEdition(harness);

    await userEvent.type(screen.getByTestId('edit-weight'), '900');
    await userEvent.press(screen.getByTestId('edit-profile-save'));

    // Le message est rattaché au champ pour le lecteur d'écran, donc masqué en
    // tant que texte : c'est le champ qui l'annonce, pas une phrase de plus.
    expect(
      await screen.findByText('Un poids compris entre 20 et 400 kg', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(updatePhysiology).not.toHaveBeenCalled();
  });

  it('dit ce que le serveur a refusé, et garde ce qui a été tapé', async () => {
    const harness = aRuntime();
    harness.users.onChangeHandle = () =>
      Promise.reject(new RunTrackError({ code: 'HANDLE_TAKEN', message: 'déjà pris', status: 409 }));
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
