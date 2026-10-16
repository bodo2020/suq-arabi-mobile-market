import { memo, useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react';
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
  const productsId = useId();
  const variants = useMemo(() => getProductListWithVariants(products), [products]);

  if (!variants.length) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#d8ebdf] bg-white p-3 sm:p-5" aria-label={collection.title}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 border-r-[3px] border-[#FFC120] pr-2.5">
          <h2 className="text-base font-black leading-6 text-[#005931] sm:text-xl">{collection.title}</h2>
          <p className="mt-1 text-[11px] font-medium tabular-nums text-slate-500">{variants.length} منتج</p>
        </div>
        {variants.length > 3 && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={productsId}
            aria-label={expanded ? `اختصار مجموعة ${collection.title}` : `عرض كل منتجات ${collection.title}`}
            onClick={() => { setExpanded(value => !value); setVisibleCount(12); }}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-bold text-[#005931] hover:bg-[#fff5d3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:text-sm"
          >
            {expanded ? <>عرض أقل <ChevronUp size={16} /></> : <>عرض الكل <ChevronLeft size={16} /></>}
          </button>
        )}
      </div>
      {collection.description && <p className="-mt-2 mb-4 text-xs leading-5 text-slate-500 sm:text-sm">{collection.description}</p>}

      {expanded ? (
        <div id={productsId} className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
          {variants.slice(0, visibleCount).map(product => <ProductCard key={product.variantKey} product={product} hideIfUnavailable={false} showBulkQuantity={false} />)}
        </div>
      ) : (
        <div id={productsId} className="hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2" dir="rtl" aria-label={`منتجات ${collection.title}`}>
          {variants.slice(0, 6).map(product => (
            <div key={product.variantKey} className="w-[124px] shrink-0 snap-start sm:w-[158px]">
              <ProductCard product={product} hideIfUnavailable={false} showBulkQuantity={false} />
            </div>
          ))}
        </div>
      )}

      {expanded && visibleCount < variants.length && (
        <button type="button" onClick={() => setVisibleCount(count => count + 12)} className="mx-auto mt-4 flex min-h-11 items-center justify-center gap-1 rounded-xl px-4 text-xs font-bold text-[#005931] hover:bg-[#fff5d3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          عرض {Math.min(12, variants.length - visibleCount)} منتج إضافي <ChevronDown size={16} />
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
