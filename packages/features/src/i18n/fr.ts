/**
 * The one and only dictionary, for now.
 *
 * §15 forbids untranslated hard-coded text "even if v1 has a single language",
 * and the reason is not the language: it is that a string written inside a
 * screen is a string nobody can find again. Every one of them is here, keyed,
 * and the key type is derived from this object — a `t('auth.signIn.titel')`
 * does not compile.
 *
 * A real i18n library was weighed and left out: §14 counts every kilobyte of
 * the initial bundle, and what a single-locale application needs is a lookup
 * and an interpolation.
 */
export const fr = {
  'common.cancel': 'Annuler',
  'common.retry': 'Réessayer',
  'common.continue': 'Continuer',
  'common.back': 'Retour',
  'common.loading': 'Chargement',
  'common.email': 'Adresse e-mail',
  'common.password': 'Mot de passe',
  'common.required': 'Ce champ est obligatoire',

  'auth.signIn.title': 'Content de vous revoir',
  'auth.signIn.subtitle': 'Connectez-vous pour retrouver vos courses.',
  'auth.signIn.submit': 'Se connecter',
  'auth.signIn.forgotPassword': 'Mot de passe oublié ?',
  'auth.signIn.noAccount': 'Pas encore de compte ? Créer un compte',
  'auth.signIn.emailPlaceholder': 'vous@exemple.fr',

  'auth.signUp.title': 'Créer un compte',
  'auth.signUp.subtitle': 'Il vous faut un pseudonyme, une adresse et un mot de passe.',
  'auth.signUp.handle': 'Pseudonyme',
  'auth.signUp.handleHint': 'Entre 3 et 30 caractères, visible par les autres coureurs',
  'auth.signUp.displayName': 'Nom affiché',
  'auth.signUp.passwordHint': 'Douze caractères au minimum',
  'auth.signUp.submit': 'Créer mon compte',
  'auth.signUp.haveAccount': 'Déjà un compte ? Se connecter',
  'auth.signUp.done': 'Compte créé',
  'auth.signUp.doneDetail':
    'Un message vient de partir vers {email}. Confirmez l’adresse pour vous connecter.',

  'auth.forgotPassword.title': 'Mot de passe oublié',
  'auth.forgotPassword.subtitle':
    'Indiquez votre adresse : si un compte y est rattaché, vous recevrez un lien.',
  'auth.forgotPassword.submit': 'Envoyer le lien',
  'auth.forgotPassword.done': 'Message envoyé',
  'auth.forgotPassword.doneDetail':
    'Si un compte existe pour {email}, le lien y est parti. Il est valable trente minutes.',

  'auth.resetPassword.title': 'Nouveau mot de passe',
  'auth.resetPassword.subtitle': 'Choisissez-en un que vous n’utilisez nulle part ailleurs.',
  'auth.resetPassword.newPassword': 'Nouveau mot de passe',
  'auth.resetPassword.confirm': 'Confirmer le mot de passe',
  'auth.resetPassword.mismatch': 'Les deux mots de passe ne sont pas identiques',
  'auth.resetPassword.submit': 'Changer le mot de passe',
  'auth.resetPassword.done': 'Mot de passe changé',
  'auth.resetPassword.doneDetail': 'Vous pouvez vous connecter avec le nouveau.',

  'auth.verifyEmail.checking': 'Confirmation de votre adresse',
  'auth.verifyEmail.done': 'Adresse confirmée',
  'auth.verifyEmail.doneDetail': 'Votre compte est actif. Bonne course.',
  'auth.verifyEmail.missingToken': 'Ce lien est incomplet',
  'auth.verifyEmail.missingTokenDetail':
    'Ouvrez-le depuis le message reçu, sans le recopier à la main.',

  'auth.validation.emailRequired': 'Indiquez votre adresse e-mail',
  'auth.validation.emailMalformed': 'Cette adresse ne ressemble pas à une adresse e-mail',
  'auth.validation.passwordRequired': 'Indiquez votre mot de passe',
  'auth.validation.passwordTooShort': 'Douze caractères au minimum',
  'auth.validation.handleRequired': 'Choisissez un pseudonyme',
  'auth.validation.handleTooShort': 'Trois caractères au minimum',
  'auth.validation.handleTooLong': 'Trente caractères au maximum',
  'auth.validation.displayNameRequired': 'Indiquez le nom qui sera affiché',

  // §15 : jamais « une erreur est survenue » sans regarder le champ `code`.
  'error.unknown': 'Quelque chose n’a pas fonctionné',
  'error.unknownDetail': 'Réessayez dans un instant. Si cela persiste, citez la référence.',
  'error.network': 'Pas de réseau',
  'error.networkDetail': 'Vérifiez votre connexion, puis réessayez.',
  'error.AUTHENTICATION_REQUIRED': 'Votre session a expiré',
  'error.BAD_CREDENTIALS': 'Adresse ou mot de passe incorrect',
  'error.CREDENTIALS_NOT_FOUND': 'Adresse ou mot de passe incorrect',
  'error.ACCOUNT_NOT_ACTIVE': 'Ce compte n’est pas encore confirmé',
  'error.ACCOUNT_DELETED': 'Ce compte a été supprimé',
  'error.EMAIL_TAKEN': 'Cette adresse est déjà utilisée',
  'error.EMAIL_ALREADY_VERIFIED': 'Cette adresse est déjà confirmée',
  'error.HANDLE_TAKEN': 'Ce pseudonyme est déjà pris',
  'error.TOO_MANY_ATTEMPTS': 'Trop de tentatives, patientez quelques minutes',
  'error.TOKEN_EXPIRED': 'Ce lien a expiré',
  'error.TOKEN_UNKNOWN': 'Ce lien n’est pas valable',
  'error.TOKEN_ALREADY_USED': 'Ce lien a déjà servi',
  'error.TOKEN_WRONG_PURPOSE': 'Ce lien ne sert pas à cela',
  'error.REFRESH_TOKEN_EXPIRED': 'Votre session a expiré',
  'error.REFRESH_TOKEN_REUSED': 'Votre session a été fermée par sécurité',
  'error.REFRESH_TOKEN_REVOKED': 'Votre session a été fermée',
  'error.REFRESH_TOKEN_UNKNOWN': 'Votre session n’est plus reconnue',
  'error.ACTIVITY_NOT_FOUND': 'Cette course est introuvable',
  'error.ACTIVITY_NOT_YOURS': 'Cette course ne vous appartient pas',
  'error.ACTIVITY_NOT_VISIBLE': 'Cette course n’est pas partagée avec vous',
  'error.ACTIVITY_NOT_LIVE': 'Cette course n’est pas en cours',
  'error.ACTIVITY_NOT_PAUSED': 'Cette course n’est pas en pause',
  'error.ACTIVITY_ALREADY_ENDED': 'Cette course est déjà terminée',
  'error.ACTIVITY_NOT_ACCEPTING_POINTS': 'Cette course n’enregistre plus de points',
  'error.DEVICE_CLOCK_TOO_FAR_OFF': 'L’horloge de votre téléphone est trop décalée',
  'error.IDEMPOTENCY_KEY_REUSED': 'Ce lot de points a déjà été envoyé différemment',
  'error.INGESTION_CONFLICT': 'Un envoi de points est déjà en cours',
  'error.TOO_MANY_BATCHES': 'Trop d’envois d’affilée, patientez un instant',
  'error.TRACK_NOT_ARCHIVED': 'La trace de cette course n’est pas encore figée',
  'error.USER_NOT_FOUND': 'Ce compte est introuvable',
  'error.BLOCKED': 'Un blocage empêche cette action',
  'error.SELF_BLOCK': 'Vous ne pouvez pas vous bloquer vous-même',
  'error.SELF_FOLLOW': 'Vous ne pouvez pas vous suivre vous-même',
  'error.FOLLOW_ALREADY_ACCEPTED': 'Vous suivez déjà ce compte',
  'error.FOLLOW_REQUEST_NOT_FOUND': 'Cette demande n’existe plus',
  'error.NOT_YOUR_REQUEST': 'Cette demande ne vous concerne pas',
  'error.COMMENT_NOT_FOUND': 'Ce commentaire est introuvable',
  'error.COMMENT_DELETED': 'Ce commentaire a été supprimé',
  'error.COMMENT_EDIT_WINDOW_CLOSED': 'Le délai de modification est passé',
  'error.COMMENT_NESTING_TOO_DEEP': 'On ne peut pas répondre plus profondément',
  'error.TOO_MANY_COMMENTS': 'Trop de commentaires d’affilée, patientez un instant',
  'error.NOTIFICATION_NOT_FOUND': 'Cette notification est introuvable',
  'error.DEVICE_NOT_FOUND': 'Cet appareil n’est pas enregistré',
  'error.UNREGISTERED': 'Cet appareil ne reçoit plus de notifications',
  'error.SHARE_LINK_NOT_FOUND': 'Ce lien de partage n’existe plus',
  'error.INVALID_REQUEST': 'La demande n’a pas été comprise',
  'error.INVALID_ARGUMENT': 'Une valeur envoyée n’est pas acceptée',
  'error.INVALID_VALUE': 'Une valeur envoyée n’est pas acceptée',
  'error.reference': 'Référence : {correlationId}',
} as const;

export type TranslationKey = keyof typeof fr;
