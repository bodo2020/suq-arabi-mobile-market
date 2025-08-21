import { Product } from '@/lib/supabase';

// Function to create product variants (regular and bulk) for display
export const getProductVariants = (product: Product) => {
  const variants = [];
  
  // Always add regular product
  variants.push({
    ...product,
    displayType: 'regular' as const,
    id: product.id, // Keep original ID for linking
    variantKey: `${product.id}_regular` // Unique key for React rendering
  });
  
  // Add bulk variant if bulk is enabled and available
  if (product.bulk_enabled && 
      product.bulk_quantity && 
      product.bulk_price && 
      product.quantity >= product.bulk_quantity) {
    variants.push({
      ...product,
      displayType: 'bulk' as const,
      id: product.id, // Keep original ID for linking
      variantKey: `${product.id}_bulk`, // Unique key for React rendering
      price: product.bulk_price, // Override price with bulk price
      offer_price: undefined // Remove offer price for bulk
    });
  }
  
  return variants;
};

// Function to process a list of products and return all variants
export const getProductListWithVariants = (products: Product[]) => {
  return products.flatMap(product => getProductVariants(product));
};