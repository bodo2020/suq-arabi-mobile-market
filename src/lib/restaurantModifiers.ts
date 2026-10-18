/**
 * Restaurant modifier contract for the customer menu UI.
 * Client-side validation and price previews are advisory: checkout must
 * revalidate options, availability and prices on the server before ordering.
 */
export type RestaurantModifierOption = {
  id: string;
  name: string;
  price_delta: number; // EGP, max two decimal places
  active?: boolean;
  max_quantity?: number; // defaults to one (no repeated selection)
};

export type RestaurantModifierGroup = {
  id: string;
  name: string;
  min_choices: number;
  max_choices: number;
  active?: boolean;
  options: RestaurantModifierOption[];
};

export type RestaurantModifierPick = {
  group_id: string;
  option_id: string;
  quantity: number;
};

export type RestaurantModifierResult = {
  picks: RestaurantModifierPick[];
  price_delta: number; // EGP, informational until server quote
  selection_key: string; // canonical ordering; safe to embed in cart line identity
};

export class RestaurantModifierError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'RestaurantModifierError';
  }
}

const requireValid = (condition: boolean, code: string) => {
  if (!condition) throw new RestaurantModifierError(code);
};

const whole = (value: number) => Number.isSafeInteger(value) && value >= 0;
const piasters = (egp: number) => {
  requireValid(Number.isFinite(egp) && egp >= 0, 'MODIFIER_INVALID_PRICE');
  const scaled = Math.round(egp * 100);
  requireValid(Number.isSafeInteger(scaled) && Math.abs(scaled / 100 - egp) < 1e-8, 'MODIFIER_INVALID_PRICE');
  return scaled;
};

function verifyGroups(groups: RestaurantModifierGroup[]) {
  const groupIds = new Set<string>();
  for (const group of groups) {
    requireValid(Boolean(group.id) && !groupIds.has(group.id), 'MODIFIER_INVALID_GROUP');
    groupIds.add(group.id);
    requireValid(
      whole(group.min_choices) && whole(group.max_choices) && group.min_choices <= group.max_choices && group.max_choices <= 100,
      'MODIFIER_INVALID_GROUP',
    );
    const optionIds = new Set<string>();
    let capacity = 0;
    for (const option of group.options) {
      requireValid(Boolean(option.id) && !optionIds.has(option.id), 'MODIFIER_INVALID_OPTION');
      optionIds.add(option.id);
      piasters(option.price_delta);
      const max = option.max_quantity ?? 1;
      requireValid(Number.isSafeInteger(max) && max >= 1 && max <= 100, 'MODIFIER_INVALID_OPTION');
      if (option.active !== false) capacity += max;
    }
    if (group.active !== false) {
      requireValid(group.min_choices <= capacity, 'MODIFIER_UNAVAILABLE_REQUIRED');
    }
  }
}

/** Total cost of the cheapest VALID mandatory configuration (not just base item). */
export function minimumRestaurantModifierPrice(groups: RestaurantModifierGroup[]): number {
  verifyGroups(groups);
  let total = 0;
  for (const group of groups) {
    if (group.active === false || group.min_choices === 0) continue;
    const prices = group.options
      .filter(option => option.active !== false)
      .flatMap(option => Array(option.max_quantity ?? 1).fill(piasters(option.price_delta)))
      .sort((a, b) => a - b);
    for (let i = 0; i < group.min_choices; i++) total += prices[i];
  }
  return total / 100;
}

/** Canonical and deterministic across selection order; no server-side pricing trust. */
export function evaluateRestaurantModifiers(
  groups: RestaurantModifierGroup[],
  requested: RestaurantModifierPick[],
): RestaurantModifierResult {
  verifyGroups(groups);
  requireValid(Array.isArray(requested), 'MODIFIER_INVALID_SELECTION');
  const byGroup = new Map(groups.map(group => [group.id, group]));
  const counts = new Map<string, number>();
  let total = 0;
  for (const pick of requested) {
    requireValid(
      Boolean(pick) && typeof pick.group_id === 'string' && typeof pick.option_id === 'string'
      && Number.isSafeInteger(pick.quantity) && pick.quantity >= 1,
      'MODIFIER_INVALID_SELECTION',
    );
    const group = byGroup.get(pick.group_id);
    requireValid(Boolean(group && group.active !== false), 'MODIFIER_GROUP_UNAVAILABLE');
    const option = group!.options.find(value => value.id === pick.option_id);
    requireValid(Boolean(option && option.active !== false), 'MODIFIER_OPTION_UNAVAILABLE');
    const key = JSON.stringify([pick.group_id, pick.option_id]);
    requireValid(!counts.has(key), 'MODIFIER_DUPLICATE_OPTION');
    requireValid(pick.quantity <= (option!.max_quantity ?? 1), 'MODIFIER_TOO_MANY');
    counts.set(key, pick.quantity);
    total += piasters(option!.price_delta) * pick.quantity;
    requireValid(Number.isSafeInteger(total), 'MODIFIER_INVALID_PRICE');
  }

  for (const group of groups) {
    const selected = requested
      .filter(value => value.group_id === group.id)
      .reduce((amount, value) => amount + value.quantity, 0);
    requireValid(
      group.active === false ? selected === 0 : selected >= group.min_choices && selected <= group.max_choices,
      group.active === false ? 'MODIFIER_GROUP_UNAVAILABLE' : 'MODIFIER_REQUIRED_OR_LIMIT',
    );
  }

  const picks = requested
    .map(pick => ({ group_id: pick.group_id, option_id: pick.option_id, quantity: pick.quantity }))
    .sort((a, b) => (a.group_id < b.group_id ? -1 : a.group_id > b.group_id ? 1 : 0)
      || (a.option_id < b.option_id ? -1 : a.option_id > b.option_id ? 1 : 0));
  return {
    picks,
    price_delta: total / 100,
    selection_key: JSON.stringify(picks.map(({ group_id, option_id, quantity }) => [group_id, option_id, quantity])),
  };
}
