import type { Product } from '@/lib/supabase';

const WEIGHT_UNITS = new Set(['weight', 'kg', 'كيلوجرام', 'كجم']);

export const isWeightedProduct = (product: Pick<Product, 'barcode_type' | 'unit_of_measure'>) => {
  const unit = (product.unit_of_measure || '').trim().toLowerCase();
  return product.barcode_type === 'scale' || WEIGHT_UNITS.has(unit);
};

export const productUnitPrice = (product: Pick<Product, 'price' | 'offer_price'>) => {
  const offer = Number(product.offer_price || 0);
  const price = Number(product.price || 0);
  return offer > 0 && offer < price ? offer : price;
};

export const hasBulkPurchase = (product: Pick<Product, 'bulk_enabled' | 'bulk_quantity' | 'bulk_price' | 'barcode_type' | 'unit_of_measure'>) => {
  // The authoritative checkout currently supports bulk packs for piece products only.
  if (isWeightedProduct(product)) return false;
  return Boolean(
    product.bulk_enabled &&
    Number(product.bulk_quantity || 0) > 0 &&
    Number(product.bulk_price || 0) >= 0,
  );
};
