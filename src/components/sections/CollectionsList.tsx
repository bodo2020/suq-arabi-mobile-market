import { memo, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Layers3 } from 'lucide-react';
import type { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { getProductListWithVariants } from '@/utils/productUtils';

interface CollectionData {
  id: string;
  title: string;
  description: string | null;
  products: string[] | null;
}

interface CollectionsListProps {
  collections: CollectionData[];
  products: Product[];
}

const CollectionCard = ({ collection, products }: { collection: CollectionData; products: Product[] }) => {
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const variants = useMemo(() => getProductListWithVariants(products), [products]);

  if (!variants.length) return null;

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#d8ebdf] bg-white p-4 shadow-[0_8px_28px_rgba(0,89,49,0.05)] sm:p-5" aria-label={collection.title}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff5d3] text-[#005931]">
          <Layers3 size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black leading-7 text-[#005931] sm:text-xl">{collection.title}</h2>
          {collection.description && <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{collection.description}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-[#eaf6ee] px-2.5 py-1 text-[11px] font-bold text-[#005931]">{variants.length} منتج</span>
      </div>

      {expanded ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
          {variants.slice(0, visibleCount).map(product => <ProductCard key={product.variantKey} product={product} hideIfUnavailable={false} showBulkQuantity={false} />)}
        </div>
      ) : (
        <div className="hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2" dir="rtl" aria-label={`منتجات ${collection.title}`}>
          {variants.slice(0, 6).map(product => (
            <div key={product.variantKey} className="w-[124px] shrink-0 snap-start sm:w-[158px]">
              <ProductCard product={product} hideIfUnavailable={false} showBulkQuantity={false} />
            </div>
          ))}
        </div>
      )}

      {expanded && visibleCount < variants.length && (
        <button type="button" onClick={() => setVisibleCount(count => count + 12)} className="mt-4 min-h-11 w-full rounded-xl border border-[#c8e0d2] bg-white px-4 text-sm font-bold text-[#005931] hover:bg-[#fff5d3]">
          عرض منتجات أكثر
        </button>
      )}
      {variants.length > 6 && (
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#fff5d3] px-4 text-sm font-bold text-[#005931] hover:bg-[#ffe78d]">
          {expanded ? <><ChevronUp size={17} /> عرض مختصر</> : <><ChevronDown size={17} /> عرض كل المجموعة</>}
        </button>
      )}
    </section>
  );
};

const CollectionsList = memo(({ collections, products }: CollectionsListProps) => {
  const productMap = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);

  return (
    <div className="space-y-6">
      {collections.map(collection => {
        const collectionProducts = Array.from(new Set(collection.products || []))
          .map(id => productMap.get(id))
          .filter((product): product is Product => Boolean(product));
        if (!collectionProducts.length) return null;
        return <CollectionCard key={collection.id} collection={collection} products={collectionProducts} />;
      })}
    </div>
  );
});

CollectionsList.displayName = 'CollectionsList';

export default CollectionsList;
