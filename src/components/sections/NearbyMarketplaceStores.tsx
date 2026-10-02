import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { getNearbyMarketplaceStores } from '@/lib/marketplace';
import MarketplaceStoreCard from '@/components/ui/MarketplaceStoreCard';

export default function NearbyMarketplaceStores({ locationKey }: { locationKey: string }) {
  const query = useQuery({
    queryKey: ['nearby-marketplace-stores', locationKey],
    queryFn: () => getNearbyMarketplaceStores(6),
    enabled: Boolean(locationKey),
    staleTime: 30_000,
    retry: 1,
  });

  if (!locationKey || query.isLoading || query.isError || !query.data?.length) return null;

  return (
    <section className="mb-7" aria-label="متاجر قريبة منك">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-primary">محلات شركاء ســــــوبـرمــــاركو</p>
          <h2 className="text-xl font-black text-gray-900">متاجر قريبة منك</h2>
          <p className="mt-1 text-xs text-gray-500">كل متجر له سعره ومخزونه وطلب منفصل.</p>
        </div>
        <Link to="/stores" className="flex shrink-0 items-center gap-1 rounded-full bg-[#fff5d3] px-3 py-2 text-xs font-bold text-[#005931] sm:text-sm">عرض الكل<ChevronLeft size={17} /></Link>
      </div>
      <div className="hide-scrollbar flex snap-x gap-3 overflow-x-auto pb-2">
        {query.data.map(store => <MarketplaceStoreCard key={store.branch_id} store={store} compact />)}
      </div>
    </section>
  );
}
