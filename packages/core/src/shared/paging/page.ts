/**
 * Cursor pagination, the only kind this API has: you hand back the `nextCursor`
 * the previous page gave you. There is no page number and no offset, so no type
 * here should let a caller invent one.
 *
 * `nextCursor` absent means the end has been reached — not "unknown". That
 * distinction is what stops an infinite list from asking forever.
 */
export interface Page<T> {
  items: readonly T[];
  nextCursor?: string | undefined;
}

export interface PageRequest {
  cursor?: string | undefined;
  limit?: number | undefined;
}

export function isLastPage<T>(page: Page<T>): boolean {
  return page.nextCursor === undefined;
}

/** Flattens pages already read, in order, without losing the last cursor. */
export function mergePages<T>(pages: readonly Page<T>[]): Page<T> {
  const last = pages[pages.length - 1];
  const items = pages.flatMap((page) => [...page.items]);
  return last?.nextCursor === undefined ? { items } : { items, nextCursor: last.nextCursor };
}
