/** Customer-facing Marko AI intent contract, not a source of prices or SKUs.
 * Server validates group slugs against the published catalogue. */
export type MarkoShoppingIntent =
  | { kind: 'group'; slug: string; people: 2 | 4 | 6 | 8; budget: 'simple' | 'medium' | 'large' }
  | { kind: 'search'; query: string }
  | { kind: 'unknown' };

export function interpretMarkoResponse(value: unknown): MarkoShoppingIntent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { kind: 'unknown' };
  const result = value as Record<string, unknown>;

  if (typeof result.slug === 'string' && /^[a-z0-9-]{2,64}$/.test(result.slug)) {
    const count = Number(result.people);
    const people = (count === 2 || count === 4 || count === 6 || count === 8 ? count : 4) as 2 | 4 | 6 | 8;
    const budget = (result.budget === 'simple' || result.budget === 'large' ? result.budget : 'medium') as 'simple' | 'medium' | 'large';
    return { kind: 'group', slug: result.slug, people, budget };
  }

  if (typeof result.search_query === 'string') {
    const query = result.search_query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 64).trim();
    if (query.length >= 2) return { kind: 'search', query };
  }
  return { kind: 'unknown' };
}
