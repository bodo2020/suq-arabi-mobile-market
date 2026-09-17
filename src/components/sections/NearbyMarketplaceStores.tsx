import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Clock3, MapPin, Store } from 'lucide-react';
import { getNearbyMarketplaceStores } from '@/lib/marketplace';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);

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
          <p className="text-xs font-semibold text-primary">Marketplace</p>
          <h2 className="text-xl font-black text-gray-900">متاجر قريبة منك</h2>
          <p className="mt-1 text-xs text-gray-500">كل متجر له سعره ومخزونه وطلب منفصل.</p>
        </div>
        <Link to="/stores" className="flex items-center gap-1 text-sm font-bold text-primary">عرض الكل<ChevronLeft size={17} /></Link>
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {query.data.map(store => (
          <Link key={store.branch_id} to={`/stores/${store.branch_id}`} className="min-w-[250px] snap-start rounded-2xl border border-green-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-primary"><Store size={22} /></span>
              <div className="min-w-0 flex-1"><h3 className="truncate font-black text-gray-900">{store.merchant_name}</h3><p className="truncate text-xs text-gray-500">{store.branch_name}</p></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <span className="flex items-center gap-1"><MapPin size={14} />{money(store.distance_km)} كم</span>
              <span className="flex items-center gap-1"><Clock3 size={14} />{store.estimated_time || (store.estimated_delivery_minutes ? `${store.estimated_delivery_minutes} دقيقة` : 'حسب المنطقة')}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs"><span>التوصيل {store.delivery_fee > 0 ? `${money(store.delivery_fee)} ج.م` : 'مجاني'}</span><strong className="text-primary">{money(store.available_products)} منتج متاح</strong></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
