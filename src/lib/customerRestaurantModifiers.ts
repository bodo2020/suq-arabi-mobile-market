import { supabase } from "@/integrations/supabase/client";
import type { RestaurantModifierGroup, RestaurantModifierPick } from "@/lib/restaurantModifiers";

export type RestaurantListingModifierPreview = {
  groups: RestaurantModifierGroup[];
  configurable: boolean;
  checkout_enabled: false;
};

/**
 * This is a READ-ONLY preview endpoint.
 * Never pass chosen options or displayed deltas through legacy checkout:
 * the quote/place RPCs do not yet verify modifier selections.
 */
export async function getRestaurantListingModifierPreview(
  branchId: string, productId: string,
): Promise<RestaurantListingModifierPreview> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string, args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  const { data, error } = await rpc("get_restaurant_listing_modifiers_v1", {
    p_branch_id: branchId,
    p_product_id: productId,
  });
  if (error) throw new Error("RESTAURANT_MODIFIER_PREVIEW_UNAVAILABLE");
  if (!data || typeof data !== "object") throw new Error("RESTAURANT_MODIFIER_PREVIEW_INVALID");
  const result = data as Record<string, unknown>;
  if (!Array.isArray(result.groups)) throw new Error("RESTAURANT_MODIFIER_PREVIEW_INVALID");
  // Remain hard-disabled until end-to-end price+selection checks are in place.
  return { groups: result.groups as RestaurantModifierGroup[], configurable: result.groups.length > 0, checkout_enabled: false };
}

export type VerifiedRestaurantModifierQuote = {
  branch_id: string;
  product_id: string;
  picks: Array<{
    group_id: string; group_name: string;
    option_id: string; option_name: string;
    quantity: number; unit_price_delta: number; line_price_delta: number;
  }>;
  selection_key: string;
  price_delta: number;
  checkout_enabled: false;
};

/** Verified server preview ONLY. Never add the option delta to existing checkout. */
export async function quoteRestaurantModifierTryOn(
  branchId: string, productId: string, picks: RestaurantModifierPick[],
): Promise<VerifiedRestaurantModifierQuote> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string, args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  const { data, error } = await rpc("quote_restaurant_modifiers_v1", {
    p_branch_id: branchId, p_product_id: productId, p_picks: picks,
  });
  if (error) throw new Error(error.message || "RESTAURANT_MODIFIER_QUOTE_UNAVAILABLE");
  if (!data || typeof data !== "object") throw new Error("RESTAURANT_MODIFIER_QUOTE_INVALID");
  const quote = data as VerifiedRestaurantModifierQuote;
  if (quote.branch_id !== branchId || quote.product_id !== productId ||
      quote.checkout_enabled !== false ||
      !Array.isArray(quote.picks) || typeof quote.selection_key !== "string" ||
      !Number.isFinite(Number(quote.price_delta)) || Number(quote.price_delta) < 0) {
    throw new Error("RESTAURANT_MODIFIER_QUOTE_INVALID");
  }
  return quote;
}
