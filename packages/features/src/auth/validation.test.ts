import {
  validateConfirmation,
  validateDisplayName,
  validateEmail,
  validateHandle,
  validateNewPassword,
  validatePasswordPresence,
} from './validation';

describe('validation d’adresse', () => {
  it('accepte une adresse plausible', () => {
    expect(validateEmail('thomas@exemple.fr')).toBeUndefined();
    expect(validateEmail('  thomas@exemple.fr  ')).toBeUndefined();
  });

  it('refuse une adresse vide', () => {
    expect(validateEmail('')).toBe('auth.validation.emailRequired');
    expect(validateEmail('   ')).toBe('auth.validation.emailRequired');
  });

  it('refuse ce qui n’en est visiblement pas une', () => {
    for (const value of ['thomas', 'thomas@', '@exemple.fr', 'thomas@exemple', 'a b@c.fr']) {
      expect(validateEmail(value)).toBe('auth.validation.emailMalformed');
    }
  });
});

describe('validation de mot de passe', () => {
  it('exige seulement une présence pour se connecter', () => {
    // Le serveur décide si c'est le bon ; imposer douze caractères ici
    // empêcherait un ancien compte de se connecter.
    expect(validatePasswordPresence('court')).toBeUndefined();
    expect(validatePasswordPresence('')).toBe('auth.validation.passwordRequired');
  });

  it('exige douze caractères pour en choisir un', () => {
    expect(validateNewPassword('')).toBe('auth.validation.passwordRequired');
    expect(validateNewPassword('onzecaract')).toBe('auth.validation.passwordTooShort');
    expect(validateNewPassword('douzecaracte')).toBeUndefined();
  });

  it('compte les caractères, pas les unités de code', () => {
    // Douze emojis font douze caractères pour la personne qui les tape.
    expect(validateNewPassword('🏃'.repeat(12))).toBeUndefined();
    expect(validateNewPassword('🏃'.repeat(11))).toBe('auth.validation.passwordTooShort');
  });

  it('compare les deux saisies', () => {
    expect(validateConfirmation('motdepasse1234', 'motdepasse1234')).toBeUndefined();
    expect(validateConfirmation('motdepasse1234', 'autre')).toBe('auth.resetPassword.mismatch');
  });
});

describe('validation de pseudonyme et de nom', () => {
  it('respecte les bornes du serveur', () => {
    expect(validateHandle('')).toBe('auth.validation.handleRequired');
    expect(validateHandle('th')).toBe('auth.validation.handleTooShort');
    expect(validateHandle('tho')).toBeUndefined();
    expect(validateHandle('t'.repeat(30))).toBeUndefined();
    expect(validateHandle('t'.repeat(31))).toBe('auth.validation.handleTooLong');
  });

  it('exige un nom affiché', () => {
    expect(validateDisplayName('  ')).toBe('auth.validation.displayNameRequired');
    expect(validateDisplayName('Thomas')).toBeUndefined();
  });
});
