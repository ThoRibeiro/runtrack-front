import { screen, userEvent } from '@testing-library/react-native';
import { Checkbox } from '../Checkbox';
import { FormField } from '../FormField';
import { Input } from '../Input';
import { RadioGroup } from '../Radio';
import { Switch } from '../Switch';
import { renderInTheme } from './harness';

/**
 * §3 and §5: `radio`, `checkbox` and `switch` are never used alone. What is
 * asserted here is the consequence — the control announces the field's label,
 * not "interrupteur, activé" with nothing attached.
 */
describe('FormField', () => {
  it('donne son libellé au contrôle', async () => {
    await renderInTheme(
      <FormField label="Heures calmes">
        {(field) => <Switch field={field} defaultValue={false} />}
      </FormField>,
    );

    expect(screen.getByRole('switch', { name: 'Heures calmes' })).toBeOnTheScreen();
  });

  it('marque un champ obligatoire dans le nom accessible', async () => {
    await renderInTheme(
      <FormField label="Adresse e-mail" required>
        {(field) => <Input field={field} defaultValue="" />}
      </FormField>,
    );

    expect(screen.getByLabelText('Adresse e-mail, obligatoire')).toBeOnTheScreen();
  });

  it('rattache l’erreur au champ et l’affiche', async () => {
    await renderInTheme(
      <FormField label="Mot de passe" error="Il manque au moins huit caractères">
        {(field) => <Input field={field} defaultValue="abc" />}
      </FormField>,
    );

    expect(screen.getByLabelText('Mot de passe')).toHaveProp(
      'accessibilityHint',
      'Il manque au moins huit caractères',
    );
    // §15 : jamais portée par la seule couleur — le texte est bien rendu, et il
    // est annoncé par la région vivante qui l'entoure.
    expect(
      screen.getByText('Il manque au moins huit caractères', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Il manque au moins huit caractères').length).toBeGreaterThan(
      0,
    );
  });

  it('remplace l’indice par l’erreur quand il y en a une', async () => {
    await renderInTheme(
      <FormField label="Commentaire" hint="Visible par vos abonnés" error="Trop long">
        {(field) => <Input field={field} defaultValue="" />}
      </FormField>,
    );

    expect(
      screen.queryByText('Visible par vos abonnés', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('Trop long', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('expose l’état coché d’une case et le bascule', async () => {
    const onValueChange = jest.fn();
    await renderInTheme(
      <FormField label="Accepter les conditions">
        {(field) => <Checkbox field={field} defaultValue={false} onValueChange={onValueChange} />}
      </FormField>,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Accepter les conditions' });
    expect(checkbox).not.toBeChecked();

    await userEvent.press(checkbox);

    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('checkbox', { name: 'Accepter les conditions' })).toBeChecked();
  });

  it('annonce la position de chaque radio dans son groupe', async () => {
    await renderInTheme(
      <FormField label="Visibilité">
        {(field) => (
          <RadioGroup
            field={field}
            options={[
              { value: 'public', label: 'Publique' },
              { value: 'private', label: 'Privée' },
            ]}
            value="public"
            onValueChange={() => undefined}
          />
        )}
      </FormField>,
    );

    expect(screen.getByRole('radio', { name: 'Publique, 1 sur 2' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Privée, 2 sur 2' })).not.toBeChecked();
  });
});
