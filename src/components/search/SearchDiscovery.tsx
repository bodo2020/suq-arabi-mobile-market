import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import { useBranch } from '@/contexts/BranchContext';
import { useUser } from '@/contexts/UserContext';
import { normalizeArabicSearch } from '@/lib/arabicSearch';
import { getHomeRecommendationIds } from '@/lib/homePage';
import { getBranchCatalog, type Product } from '@/lib/supabase';

type SearchDiscoveryProps = {
  recent: string[];
  onSearch: (value: string) => void;
};

type ShoppingIdea = {
  title: string;
  terms: readonly string[];
};

const ideas: ShoppingIdea[] = [
  { title: 'فطار الجمعة', terms: ['جبنة', 'بيض', 'لبن', 'توست', 'عسل', 'مربى', 'شاي'] },
  { title: 'مكرونة بشاميل', terms: ['مكرونة', 'لبن', 'دقيق', 'زبدة', 'لحمة مفرومة', 'جبنة'] },
  { title: 'حلويات سريعة', terms: ['بسكويت', 'شوكولاتة', 'كريمة', 'قشطة', 'كيك', 'كاكاو'] },
  { title: 'مقاضي البيت', terms: ['رز', 'أرز', 'سكر', 'زيت', 'شاي', 'مكرونة'] },
  { title: 'سناكس وسهرة', terms: ['شيبسي', 'شيبس', 'عصير', 'مكسرات', 'بسكويت', 'فشار'] },
  { title: 'تنضيف البيت', terms: ['مسحوق', 'منظف', 'صابون', 'كلور', 'مناديل', 'سائل'] },
];

const available = (product: Product) => Number(product.quantity || 0) > 0;
const isOffer = (product: Product) => {
  const price = Number(product.price || 0);
  const offer = Number(product.offer_price || 0);
  return available(product) && price > 0 && offer > 0 && offer < price;
};

const normalizedTerms = ideas.map(idea => ({
  ...idea,
  keys: idea.terms.map(normalizeArabicSearch),
}));

function matchingIdea(product: Product, keys: readonly string[]) {
  const name = normalizeArabicSearch(product.name || '');
  const bulk = normalizeArabicSearch(product.bulk_name || '');
  return keys.some(term => name.includes(term) || (bulk && bulk.includes(term)));
}

function ProductRail({ title, products, href }: { title: string; products: Product[]; href?: string }) {
  if (!products.length) return null;
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {href && <Link to={href} aria-label={`عرض كل ${title}`} className="flex h-9 w-9 items-center justify-center rounded-full text-[#005931] transition-colors hover:bg-emerald-50"><ChevronLeft size={19} /></Link>}
      </div>
      <div className="hide-scrollbar -mx-3 flex snap-x snap-proximity gap-2.5 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0" dir="rtl">
        {products.slice(0, 10).map(product => (
          <div key={product.id} className="w-[148px] min-w-0 shrink-0 snap-start sm:w-[180px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SearchDiscovery({ recent, onSearch }: SearchDiscoveryProps) {
  const { branch, branchLoading } = useBranch();
  const { user } = useUser();
  const navigate = useNavigate();
  const [activeIdea, setActiveIdea] = useState<string | null>(null);
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

  const matchedIdeas = useMemo(() => normalizedTerms
    .map(idea => ({
      ...idea,
      matches: products.filter(product => available(product) && matchingIdea(product, idea.keys)),
    }))
    .filter(idea => idea.matches.length >= 2), [products]);

  const selectedIdea = matchedIdeas.find(idea => idea.title === activeIdea);
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
          <h2 className="mb-3 text-base font-black text-slate-950">آخر بحث</h2>
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
          {matchedIdeas.length > 0 && (
            <section className="-mx-3 bg-gradient-to-l from-[#ecf7f0] to-[#f7f4ff] px-3 py-4 sm:mx-0 sm:rounded-2xl">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-[#005931]">
                <Sparkles size={19} strokeWidth={1.8} aria-hidden="true" />
                مقترحات ذكية
              </h2>
              <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" dir="rtl">
                {matchedIdeas.map(idea => (
                  <button
                    key={idea.title}
                    type="button"
                    aria-pressed={selectedIdea?.title === idea.title}
                    onClick={() => setActiveIdea(previous => previous === idea.title ? null : idea.title)}
                    className={`min-h-11 shrink-0 rounded-2xl border px-4 text-sm font-bold transition-colors ${selectedIdea?.title === idea.title
                      ? 'border-[#005931] bg-[#005931] text-white'
                      : 'border-white bg-white text-[#35594a]'}`}
                  >
                    {idea.title}
                  </button>
                ))}
              </div>
            </section>
          )}

          {selectedIdea && <ProductRail title={selectedIdea.title} products={selectedIdea.matches} />}
          <ProductRail title="مقترح ليك" products={recommendations} />
          <ProductRail title="أفضل العروض" products={offers} href="/offers" />
        </>
      )}
    </div>
  );
}
