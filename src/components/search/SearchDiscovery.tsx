import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChefHat, ClipboardList, Tv, Trash2, BookOpen } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import { useBranch } from '@/contexts/BranchContext';
import { useUser } from '@/contexts/UserContext';
import { normalizeArabicSearch } from '@/lib/arabicSearch';
import { getSmartGroups } from '@/lib/smartShopping';
import MarcoAiPrompt from '@/components/search/MarcoAiPrompt';
import { getHomeRecommendationIds } from '@/lib/homePage';
import { getBranchCatalog, type Product } from '@/lib/supabase';

type SearchDiscoveryProps = {
  recent: string[];
  onSearch: (value: string) => void;
  onClearRecent: () => void;
};

const available = (product: Product) => Number(product.quantity || 0) > 0;
const isOffer = (product: Product) => {
  const price = Number(product.price || 0);
  const offer = Number(product.offer_price || 0);
  return available(product) && price > 0 && offer > 0 && offer < price;
};

function ProductRail({ title, products, href }: { title: string; products: Product[]; href?: string }) {
  if (!products.length) return null;
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {href && <Link to={href} aria-label={`عرض كل ${title}`} className="flex h-9 w-9 items-center justify-center rounded-full text-[#005931] transition-colors hover:bg-emerald-50"><ChevronLeft size={19} /></Link>}
      </div>
      <div className="ala-mazagak-product-rail hide-scrollbar -mx-3 flex snap-x snap-proximity gap-2.5 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0" dir="rtl">
        {products.slice(0, 10).map(product => (
          <div key={product.id} className="w-[148px] min-w-0 shrink-0 snap-start sm:w-[180px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SearchDiscovery({ recent, onSearch, onClearRecent }: SearchDiscoveryProps) {
  const { branch, branchLoading } = useBranch();
  const { user } = useUser();
  const navigate = useNavigate();
  const branchId = branch?.delivery_branch_id;

  // One cached, address-scoped catalog request drives all product rails.
  // No fabricated product cards, inventory, prices or shopper behavior.
  const catalog = useQuery({
    queryKey: ['search-discovery-catalog-v1', branchId],
    queryFn: () => getBranchCatalog({ limit: 180 }),
    enabled: Boolean(branchId),
    staleTime: 90_000,
    gcTime: 600_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const rankedIds = useQuery({
    queryKey: ['search-discovery-recommendation-ids-v1', branchId, user?.id || 'guest'],
    queryFn: () => getHomeRecommendationIds(branchId, 18),
    enabled: Boolean(branchId),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const products = useMemo(() => catalog.data || [], [catalog.data]);
  const smartGroups = useQuery({
    queryKey:['ala-mazagak-groups-v1'],
    queryFn:getSmartGroups,
    staleTime:300_000,
    refetchOnWindowFocus:false,
  });
  const recommendations = useMemo(() => {
    const inStock = products.filter(available);
    const byId = new Map(inStock.map(product => [product.id, product]));
    const recommended = (rankedIds.data || [])
      .map(id => byId.get(id))
      .filter((product): product is Product => Boolean(product));

    // Recent *local* searches provide a small relevance boost without
    // treating hypothetical user behavior as personal recommendations.
    const recentTerms = recent.slice(0, 3).map(normalizeArabicSearch).filter(Boolean);
    const fromRecent = recentTerms.length
      ? inStock.filter(product => {
          const name = normalizeArabicSearch(product.name || '');
          return recentTerms.some(term => name.includes(term));
        })
      : [];
    const seen = new Set<string>();
    return [...fromRecent, ...recommended, ...inStock].filter(product => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    }).slice(0, 10);
  }, [products, rankedIds.data, recent]);

  const offers = useMemo(() => products
    .filter(isOffer)
    .sort((a, b) => {
      const first = (Number(a.price) - Number(a.offer_price)) / Math.max(1, Number(a.price));
      const second = (Number(b.price) - Number(b.offer_price)) / Math.max(1, Number(b.price));
      return second - first;
    }).slice(0, 10), [products]);

  const queryChips = useMemo(() => {
    // Use actual catalog names to avoid suggestions that lead nowhere.
    const terms = ['لبن', 'جبنة', 'مكرونة', 'تونة', 'شاي', 'منظفات', 'عصير', 'بسكويت'];
    return terms.filter(term =>
      products.some(product => available(product) &&
        normalizeArabicSearch(product.name || '').includes(normalizeArabicSearch(term)))).slice(0, 6);
  }, [products]);

  return (
    <div className="space-y-6 pt-1">
      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-950">آخر بحث</h2>
            <button type="button" onClick={onClearRecent} aria-label="مسح سجل البحث" className="flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 size={14} aria-hidden="true" /> مسح
            </button>
          </div>
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" dir="rtl">
            {recent.slice(0, 6).map(term => (
              <button
                key={term}
                type="button"
                onClick={() => onSearch(term)}
                className="min-h-10 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 transition-colors active:bg-emerald-50"
              >
                {term}
              </button>
            ))}
          </div>
        </section>
      )}

      {queryChips.length > 0 && (
        <section>
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" dir="rtl" aria-label="بحث سريع">
            {queryChips.map(term => (
              <button
                type="button"
                key={term}
                onClick={() => onSearch(term)}
                className="min-h-10 shrink-0 rounded-2xl border border-[#d6e7de] bg-white px-4 text-sm font-semibold text-[#31594a] transition-colors active:bg-emerald-50"
              >
                {term}
              </button>
            ))}
          </div>
        </section>
      )}

      {!branchId && !branchLoading ? (
        <div className="rounded-2xl bg-white p-4 text-center">
          <button type="button" onClick={() => navigate('/address-manager')} className="min-h-11 rounded-full bg-[#005931] px-5 text-sm font-bold text-white">
            تحديد عنوان التوصيل
          </button>
        </div>
      ) : catalog.isLoading || branchLoading ? (
        <section aria-label="جاري تحميل المنتجات المقترحة">
          <div className="mb-3 h-6 w-36 rounded-lg bg-slate-100" />
          <div className="flex gap-2.5 overflow-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="w-[148px] shrink-0" key={index}><ProductCardSkeleton /></div>
            ))}
          </div>
        </section>
      ) : catalog.isError ? (
        <div className="rounded-2xl bg-white p-4 text-center">
          <button type="button" onClick={() => void catalog.refetch()} className="min-h-10 rounded-full bg-emerald-50 px-4 text-sm font-bold text-[#005931]">
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {Boolean(smartGroups.data?.length) && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen size={19} className="text-[#005931]" aria-hidden="true" />
                <h2 className="text-lg font-black text-[#005931]">على مزاجك</h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {smartGroups.data!.map(group => {
                  const Icon = group.kind === 'recipe' ? ChefHat : group.kind === 'occasion' ? Tv : ClipboardList;
                  return (
                    <Link
                      key={group.id}
                      to={`/ala-mazagak/${group.slug}`}
                      className="flex min-h-[132px] flex-col justify-between rounded-[22px] border border-[#dcebe1] bg-[#eaf6ee] p-3.5 transition-colors active:bg-[#daf0e1]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-[#005931]">
                        <Icon size={22} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold leading-5 text-[#005931]">{group.title_ar}</h3>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#517363]">{group.subtitle_ar}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
          <MarcoAiPrompt />
          <ProductRail title="مقترح ليك" products={recommendations} />
          <ProductRail title="أفضل العروض" products={offers} href="/offers" />
        </>
      )}
    </div>
  );
}
