import type { Product } from '@/lib/supabase';

/**
 * Category cards show real products instead of designed images: up to three
 * product photos per main category, taken from the branch catalog the
 * customer can actually order from. Cropped photos (white background, see
 * productImagePipeline) are preferred because the card blends the white away.
 */
export type CategoryCovers = {
  /** main_category_id -> up to 3 image URLs */
  byCategory: Record<string, string[]>;
  /** main_category_id -> number of products available in the branch */
  counts: Record<string, number>;
  /** up to 3 images of products on offer, for the offers banner */
  offers: string[];
};

const firstImage = (product: Product) => (Array.isArray(product.image_urls) ? product.image_urls.find(Boolean) : null) || null;
const isCropped = (url: string) => url.includes('/cropped/');

function pickImages(products: Product[], max = 3): string[] {
  const picked: string[] = [];
  const seenNames = new Set<string>();
  // Cropped photos first, then the rest; skip near-duplicates (same product name start).
  const ordered = [...products].sort((a, b) => {
    const ia = firstImage(a); const ib = firstImage(b);
    return Number(Boolean(ib && isCropped(ib))) - Number(Boolean(ia && isCropped(ia)));
  });
  for (const product of ordered) {
    const url = firstImage(product);
    if (!url || picked.includes(url)) continue;
    const nameKey = String(product.name || '').trim().split(/\s+/).slice(0, 2).join(' ');
    if (nameKey && seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);
    picked.push(url);
    if (picked.length >= max) break;
  }
  return picked;
}

export function buildCategoryCovers(products: Product[]): CategoryCovers {
  const grouped: Record<string, Product[]> = {};
  for (const product of products) {
    const id = product.main_category_id;
    if (!id) continue;
    (grouped[id] ||= []).push(product);
  }
  const byCategory: Record<string, string[]> = {};
  const counts: Record<string, number> = {};
  for (const [id, list] of Object.entries(grouped)) {
    counts[id] = list.length;
    byCategory[id] = pickImages(list);
  }
  return { byCategory, counts, offers: pickImages(products.filter(product => product.is_offer)) };
}
