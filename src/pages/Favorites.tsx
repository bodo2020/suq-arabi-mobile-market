import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDeliveryBranchId, type Product } from '@/lib/supabase';
import { getFavoriteProductsByIds } from '@/lib/branchProductIds';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  backInStockReminderKey,
  getMyBackInStockReminders,
  setBackInStockReminder,
} from '@/services/backInStockReminders';
import {
  DisplayProduct,
  displayProductName,
  hasBulkPurchase,
  productCardKey,
} from '@/lib/productPurchase';

type FavoriteRow = {
  product_id: string;
  variant_id: string | null;
};

const favoriteRowKey = (row: FavoriteRow) => row.variant_id
  ? `variant:${row.variant_id}`
  : `product:${row.product_id}`;

const Favorites = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, customerId, favoritesLoaded, favoritesVersion } = useFavorites();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [deliveryBranchId, setDeliveryBranchId] = useState<string | null>(null);
  const [reminderKeys, setReminderKeys] = useState<Set<string>>(() => new Set());
  const requestVersion = useRef(0);
  const currentCustomer = useRef(customerId);
  currentCustomer.current = customerId;

  const visible = favorites.filter(product =>
    displayProductName(product).toLocaleLowerCase('ar').includes(query.trim().toLocaleLowerCase('ar')),
  );

  useEffect(() => {
    requestVersion.current += 1;
    setFavorites([]);
    setReminderKeys(new Set());
    setError(false);
    if (customerId && favoritesLoaded) void fetchFavorites(customerId);
    else if (favoritesLoaded) {
      setFavorites([]);
      setLoading(false);
    }
    return () => { requestVersion.current += 1; };
  }, [user, customerId, favoritesLoaded, favoritesVersion, retry]);

  const fetchFavorites = async (id: string) => {
    const version = requestVersion.current;
    try {
      setLoading(true);
      const branchId = await getCurrentDeliveryBranchId();
      if (!branchId) throw new Error('DELIVERY_ADDRESS_REQUIRED');

      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('product_id,variant_id')
        .eq('customer_id', id);
      if (favoritesError) throw favoritesError;

      const rows = (favoritesData || []) as unknown as FavoriteRow[];
      const uniqueRows = Array.from(
        new Map(rows.map(row => [favoriteRowKey(row), row])).values(),
      );
      const productIds = [...new Set(uniqueRows.map(favorite => favorite.product_id))];
      const [productsData, reminders] = await Promise.all([
        getFavoriteProductsByIds(productIds),
        getMyBackInStockReminders(branchId),
      ]);
      const byId = new Map(productsData.map(product => [product.id, product]));

      const ordered = uniqueRows.map(row => {
        const product = byId.get(row.product_id) as Product | undefined;
        if (!product) return null;

        if (row.variant_id) {
          if (!hasBulkPurchase(product) || product.bulk_variant_id !== row.variant_id) return null;
          return {
            ...product,
            displayType: 'bulk' as const,
            variantKey: `bulk:${row.variant_id}`,
          };
        }

        return {
          ...product,
          displayType: 'regular' as const,
          variantKey: `regular:${product.id}`,
        };
      }).filter(Boolean) as DisplayProduct[];

      if (currentCustomer.current === id && requestVersion.current === version) {
        setDeliveryBranchId(branchId);
        setFavorites(ordered);
        setReminderKeys(new Set(reminders.map(reminder => backInStockReminderKey(reminder.product_id, reminder.variant_id))));
      }
    } catch (loadError) {
      console.error('Error loading branch favorites:', loadError);
      if (requestVersion.current === version) setError(true);
    } finally {
      if (currentCustomer.current === id && requestVersion.current === version) setLoading(false);
    }
  };

  const toggleRestockReminder = async (product: DisplayProduct, nextActive: boolean) => {
    if (!deliveryBranchId) {
      toast({ title: 'اختار عنوان التوصيل', description: 'لازم نعرف فرعك علشان نبلغك وقت توفر المنتج.' });
      return;
    }

    const variantId = product.displayType === 'bulk' ? product.bulk_variant_id || null : null;
    const key = backInStockReminderKey(product.id, variantId);

    try {
      const result = await setBackInStockReminder({
        productId: product.id,
        variantId,
        deliveryBranchId,
        enabled: nextActive,
      });

      setReminderKeys(current => {
        const next = new Set(current);
        if (result.active) next.add(key);
        else next.delete(key);
        return next;
      });

      if (result.available) {
        toast({ title: 'المنتج متوفر دلوقتي', description: 'حدّثنا المفضلة علشان تقدر تضيفه للشنطة.' });
        setRetry(value => value + 1);
        return;
      }

      toast(nextActive
        ? { title: 'التذكير اتفعل', description: 'هنبلغك أول ما المنتج يرجع متوفر في فرعك.' }
        : { title: 'التذكير اتلغى', description: 'مش هنبعت تنبيه توفر للمنتج ده.' });
    } catch (reminderError) {
      console.error('Unable to update back-in-stock reminder:', reminderError);
      toast({ title: 'تعذر تحديث التذكير', description: 'حاول مرة تانية.', variant: 'destructive' });
      throw reminderError;
    }
  };

  return (
    <MainLayout>
      <TopNavBar variant="title" hideLogo hideSearch hideCart pageTitle="المفضلة" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 rounded-3xl bg-green-50 p-5 sm:p-7">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-primary"><Heart size={25} />حاجات بتحبها</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">المفضلة بتفضل محفوظة حتى لو المنتج خلص. ولو مش متوفر تقدر تفعل «نبّهني عند التوفر» وهنبلغك أول ما يرجع في فرعك.</p>
        </div>

        {user && !loading && !error && favorites.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <input type="search" aria-label="البحث في المفضلة" placeholder="دور في المفضلة…" value={query} onChange={event => setQuery(event.target.value)} className="min-h-12 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4" />
            <p role="status" className="w-full text-sm text-gray-500">{visible.length} من {favorites.length} اختيار في المفضلة</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {[...Array(8)].map((_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        ) : !user ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100"><Heart size={32} className="text-gray-300" /></div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">تسجيل الدخول مطلوب</h3>
            <p className="mb-6 text-sm text-gray-500">سجّل دخولك لعرض منتجاتك المفضلة.</p>
            <Button onClick={() => navigate('/phone-login')} className="min-w-32">تسجيل الدخول</Button>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-3xl bg-white p-8 text-center"><h2 className="text-lg font-bold">تعذّر تحميل المفضلة</h2><p className="my-3 text-gray-500">راجع اتصالك وحاول تاني.</p><Button onClick={() => setRetry(value => value + 1)}>إعادة المحاولة</Button></div>
        ) : favorites.length > 0 && visible.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center"><h2 className="text-lg font-bold">مفيش منتجات مطابقة</h2><p className="my-3 text-gray-500">جرّب كلمة بحث مختلفة.</p><Button variant="outline" onClick={() => setQuery('')}>مسح البحث</Button></div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {visible.map(product => {
              const variantId = product.displayType === 'bulk' ? product.bulk_variant_id || null : null;
              const reminderKey = backInStockReminderKey(product.id, variantId);
              return (
                <ProductCard
                  key={productCardKey(product)}
                  product={product}
                  showRestockReminder
                  restockReminderActive={reminderKeys.has(reminderKey)}
                  onRestockReminderToggle={nextActive => toggleRestockReminder(product, nextActive)}
                />
              );
            })}
          </div>
        ) : (
          <div className="brand-favorites-empty mx-auto flex max-w-md flex-col items-center justify-center rounded-3xl border border-emerald-100 bg-white px-6 py-12 text-center">
            <div className="brand-favorites-empty__art" aria-hidden="true">
              <BrandMark variant="mark" motion="reveal" className="brand-favorites-empty__bag" />
              <Heart className="brand-favorites-empty__heart brand-favorites-empty__heart--one" />
              <Heart className="brand-favorites-empty__heart brand-favorites-empty__heart--two" />
            </div>
            <h3 className="mb-2 text-xl font-black text-[#005931]">لسه مختارتش مفضلاتك</h3>
            <p className="mb-6 text-sm leading-7 text-slate-500">دوس على القلب جنب أي منتج يعجبك، وهتلاقيه مستنيك هنا.</p>
            <Button onClick={() => navigate('/')} className="min-h-12 min-w-44 rounded-2xl bg-[#005931] font-bold hover:bg-[#004a29]"><ShoppingBag size={17} className="ml-2" />يلا نتسوّق</Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Favorites;
