import { ERROR_CODES, RunTrackError } from '@runtrack/core';
import { fr } from './fr';
import { describeError } from './errorMessage';
import { translate } from './translate';

describe('traduction', () => {
  it('rend le texte de la clé', () => {
    expect(translate('auth.signIn.submit')).toBe('Se connecter');
  });

  it('interpole les valeurs', () => {
    expect(translate('auth.forgotPassword.doneDetail', { email: 'a@b.fr' })).toContain('a@b.fr');
  });

  it('laisse le marqueur intact quand la valeur manque', () => {
    // Mieux vaut « {email} » visible à l'écran qu'un trou silencieux.
    expect(translate('auth.forgotPassword.doneDetail', {})).toContain('{email}');
  });

  it('n’a aucun libellé vide', () => {
    const empty = Object.entries(fr)
      .filter(([, value]) => value.length === 0)
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });
});

describe('message d’erreur', () => {
  it('a une phrase pour chaque code du catalogue', () => {
    // §15 : le jour où le serveur ajoute un code, ce test tombe avant que
    // l'utilisateur ne voie « une erreur est survenue ».
    const keys = new Set(Object.keys(fr));
    const missing = ERROR_CODES.filter((code) => !keys.has(`error.${code}`));

    expect(missing).toEqual([]);
  });

  it('dit ce qui s’est passé, pas « une erreur est survenue »', () => {
    const described = describeError(
      new RunTrackError({ code: 'BAD_CREDENTIALS', message: 'refusé', correlationId: 'c-1' }),
    );

    expect(described.title).toBe('Adresse ou mot de passe incorrect');
    expect(described.correlationId).toBe('c-1');
  });

  it('garde le détail du serveur, qui en dit souvent plus', () => {
    const described = describeError(
      new RunTrackError({ code: 'HANDLE_TAKEN', message: 'thomas est déjà pris' }),
    );

    expect(described.detail).toBe('thomas est déjà pris');
  });

  it('replie un code inconnu sans prétendre le comprendre', () => {
    const described = describeError(new RunTrackError({ code: 'CODE_DU_FUTUR', message: 'x' }));

    expect(described.title).toBe('Quelque chose n’a pas fonctionné');
  });

  it('distingue une panne réseau d’une réponse du serveur', () => {
    // Une requête qui n'est jamais partie n'a pas de code : dire « pas de
    // réseau » est plus utile que de ne rien dire.
    expect(describeError(new TypeError('Network request failed')).title).toBe('Pas de réseau');
  });
});
