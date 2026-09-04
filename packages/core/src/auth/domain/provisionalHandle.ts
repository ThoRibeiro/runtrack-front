import type { UserId } from '../../shared/identity/ids';

/**
 * The handle a federated account is opened with, before its owner picks one.
 *
 * The server derives it from the account identifier — `runner-` followed by the
 * first eight hexadecimal characters — because a profile cannot exist without a
 * handle, and a redirect back from an identity provider is no place to ask for
 * one.
 *
 * **This duplicates a server rule, knowingly.** The alternative was a flag on
 * the profile, and a column that exists solely so the client can ask a question
 * it can already answer. The rule is stable — it is the identifier, not a
 * generated name — and both sides test it. If the server ever changes how it
 * derives, this must follow; that is the price, and it is written here so the
 * next reader knows it is a price and not an oversight.
 */
const PREFIX = 'runner-';
const DERIVED_LENGTH = 8;

export function provisionalHandleFor(id: UserId): string {
  return PREFIX + id.replace(/-/g, '').slice(0, DERIVED_LENGTH);
}

/**
 * Whether this account is still carrying the handle it was opened with.
 *
 * Drives the "choose your handle" screen, which keeps being offered for as long
 * as the answer is yes — a derived handle is not a name, and appears in URLs.
 * Someone who types that exact string as their own choice is offered it again;
 * the alternative was a flag on the profile, and the trade is deliberate.
 */
export function hasProvisionalHandle(profile: { id: UserId; handle: string }): boolean {
  return profile.handle === provisionalHandleFor(profile.id);
}
