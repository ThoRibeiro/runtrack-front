/**
 * Identifiers are opaque strings the server hands out. They are branded so that
 * an activity id cannot be passed where a user id is expected — the compiler
 * catches the argument swap that a `string` parameter list never does.
 */
declare const brand: unique symbol;

type Branded<T extends string> = string & { readonly [brand]: T };

export type UserId = Branded<'UserId'>;
export type ActivityId = Branded<'ActivityId'>;
export type CommentId = Branded<'CommentId'>;
export type NotificationId = Branded<'NotificationId'>;
export type ShareLinkId = Branded<'ShareLinkId'>;
export type DeviceToken = Branded<'DeviceToken'>;

/**
 * The single door from a raw string into an identifier. It exists so the cast
 * lives in one audited place instead of being sprinkled over every mapper.
 */
function identifier<T extends string>(value: string, kind: T): Branded<T> {
  if (value.length === 0) {
    throw new TypeError(`Identifiant ${kind} vide`);
  }
  // La marque n'existe qu'à la compilation : c'est la seule façon de la poser,
  // et c'est pour la confiner ici que cette fonction existe.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return value as Branded<T>;
}

export const userId = (value: string): UserId => identifier(value, 'UserId');
export const activityId = (value: string): ActivityId => identifier(value, 'ActivityId');
export const commentId = (value: string): CommentId => identifier(value, 'CommentId');
export const notificationId = (value: string): NotificationId =>
  identifier(value, 'NotificationId');
export const shareLinkId = (value: string): ShareLinkId => identifier(value, 'ShareLinkId');
export const deviceToken = (value: string): DeviceToken => identifier(value, 'DeviceToken');
