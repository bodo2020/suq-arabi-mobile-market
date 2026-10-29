import { supabase, type Product } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isWeightedProduct, productWeightStepGrams } from '@/lib/productPurchase';
// Generated Database types are updated by Supabase separately; new additive
// smart-shopping schema is accessed with a runtime-safe client cast.
export const shoppingDb = supabase as unknown as SupabaseClient<any>;

export type SmartGroupKind = 'recipe' | 'occasion' | 'list';
export type SmartGroup = {
  id: string;
  slug: string;
  kind: SmartGroupKind;
  title_ar: string;
  subtitle_ar: string;
  source_url: string | null;
  base_servings: number;
  position: number;
};
export type SmartGroupSlot = {
  slot_id: string;
  label: string;
  amount: number;
  unit: 'g' | 'ml' | 'piece' | 'pack';
  optional: boolean;
  position: number;
  products: Product[];
};

export async function getSmartGroups(): Promise<SmartGroup[]> {
  const { data, error } = await shoppingDb
    .from('smart_shopping_groups')
    .select('id,slug,kind,title_ar,subtitle_ar,source_url,base_servings,position')
    .eq('published', true)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data || []) as SmartGroup[];
}

export async function getSmartGroupBundle(slug: string, branchId: string): Promise<SmartGroupSlot[]> {
  const { data, error } = await shoppingDb.rpc('get_customer_smart_group_bundle_v1', {
    p_slug: slug,
    p_branch_id: branchId,
  });
  if (error) throw error;
  return ((Array.isArray(data) ? data : []) as SmartGroupSlot[])
    .map(slot => ({
      ...slot,
      amount: Number(slot.amount || 1),
      products: Array.isArray(slot.products) ? slot.products : [],
    }))
    .sort((a,b) => a.position - b.position);
}

export function availableSmartProduct(p: Product): boolean {
  return Number(p.quantity || 0) > 0 && Number(p.price || 0) >= 0;
}
export function smartProductPrice(p: Product): number {
  const original = Number(p.price || 0);
  const offer = Number(p.offer_price || 0);
  return offer > 0 && offer < original ? offer : original;
}
export function moneyEGP(value: number): string {
  return Number(value || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}
export function quantityText(amount: number, unit: SmartGroupSlot['unit']): string {
  const normalized = Number(amount.toFixed(1)).toLocaleString('ar-EG');
  return `${normalized} ${unit === 'g' ? 'جم' : unit === 'ml' ? 'مل' : unit === 'piece' ? 'قطعة' : 'عبوة'}`;
}
/** Matches common labeled sizes. Never assume a missing package size.
 * These estimates are a preview; final quantities are checked at checkout. */
export function declaredPackSize(p: Product, unit: SmartGroupSlot['unit']): number | null {
  if (unit === 'pack' || unit === 'piece') return unit === 'pack' ? 1 : null;
  const name = String(p.name || '').replace(/[٠-٩]/g, digit =>
    String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[۰-۹]/g, digit =>
    String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(كيلو|كجم|كغ|جم|جرام|غرام|لتر|مل|ملي|ملل)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const large = ['كيلو','كجم','كغ','لتر'].includes(match[2]);
  if (unit === 'g' && ['كيلو','كجم','كغ','جم','جرام','غرام'].includes(match[2]))
    return amount * (large ? 1000 : 1);
  if (unit === 'ml' && ['لتر','مل','ملي','ملل'].includes(match[2]))
    return amount * (large ? 1000 : 1);
  return null;
}

export function proposedPackCount(slot: SmartGroupSlot, product: Product, people: number, base: number): number | null {
  if (isWeightedProduct(product)) {
    const step = productWeightStepGrams(product);
    const grams = slot.unit === 'g' ? slot.amount * people / base : step;
    return Math.max(step, Math.ceil(grams / step) * step);
  }
  if (slot.unit === 'pack') return Math.max(1, Math.ceil(slot.amount * people / base));
  const size = declaredPackSize(product, slot.unit);
  if (!size) return null;
  return Math.max(1, Math.ceil(slot.amount * people / base / size));
}
