import type { Product } from '@/lib/supabase';

const WEIGHT_UNITS = new Set(['weight', 'kg', 'كيلوجرام', 'كجم']);

export type DisplayProduct = Product & {
  displayType?: 'regular' | 'bulk';
  variantKey?: string;
};

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
  if (isWeightedProduct(product)) return false;
  return Boolean(
    product.bulk_enabled &&
    Number(product.bulk_quantity || 0) > 0 &&
    Number(product.bulk_price || 0) >= 0,
  );
};

export const displayProductName = (product: DisplayProduct) => {
  if (product.displayType === 'bulk') {
    return String(product.bulk_name || '').trim() || product.name;
  }
  return product.name;
};

export const displayProductPrice = (product: DisplayProduct) => {
  return product.displayType === 'bulk'
    ? Number(product.bulk_price || 0)
    : productUnitPrice(product);
};

export const productCardKey = (product: DisplayProduct) => {
  if (product.variantKey) return product.variantKey;
  if (product.displayType === 'bulk') return `bulk:${product.bulk_variant_id || product.id}`;
  return `regular:${product.id}`;
};

export const expandProductSaleUnits = (products: Product[]): DisplayProduct[] => {
  return products.flatMap(product => {
    const regular: DisplayProduct = {
      ...product,
      displayType: 'regular',
      variantKey: `regular:${product.id}`,
    };

    if (!hasBulkPurchase(product)) return [regular];

    const bulk: DisplayProduct = {
      ...product,
      displayType: 'bulk',
      variantKey: `bulk:${product.bulk_variant_id || product.id}`,
    };

    return [regular, bulk];
  });
};