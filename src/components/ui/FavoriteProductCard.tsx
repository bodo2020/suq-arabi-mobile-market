import type { Product } from '@/lib/supabase';
import ProductCard from './ProductCard';

// Favorite listings share every product card and cart state with the catalog.
export default function FavoriteProductCard({ product }: { product: Product }) {
  return <ProductCard product={product} />;
}
