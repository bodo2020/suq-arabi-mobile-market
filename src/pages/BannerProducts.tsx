import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Image as ImageIcon, Package, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductListStructuredData from '@/components/seo/ProductListStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getProductById, getProducts, getProductsByCompany, type Product } from '@/lib/supabase';
import {
  DisplayProduct,
  displayProductName,
  displayProductPrice,
  expandProductSaleUnits,
  productCardKey,
} from '@/lib/productPurchase';

type BannerRow = {
  id: string;
  title: string;
  image_url: string;
  link: string | null;
  active: boolean | null;
  start_date: string | null;
  end_date: string | null;
  products: string[] | null;
  company_id: string | null;
  category_id: string | null;
  main_category_id: string | null;
};

type SortType = 'default' | 'price_asc' | 'price_desc' | 'name_asc';

const hasUsefulTitle = (title?: string | null) => Boolean(title?.trim() && /[A-Za-z0-9\u0600-\u06FF]/.test(title.trim()));
const isCurrentBanner = (banner: BannerRow) => {
  const now = Date.now();
  if (banner.active === false) return false;
  if (banner.start_date && new Date(banner.start_date).getTime() > now) return false;
  if (banner.end_date && new Date(banner.end_date).getTime() < now) return false;
  return true;
};

const BannerProducts = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [banner, setBanner] = useState<BannerRow | null>(null);
  const [allProducts, setAllProducts] = useState<DisplayProduct[]>([]);
  const [sourceLabel, setSourceLabel] = useState('منتجات مختارة');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortType>('default');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    setBanner(null);
    setAllProducts([]);
    setSourceLabel('منتجات مختارة');

    try {
      const { data: bannerData, error: bannerError } = await supabase
        .from('banners')
        .select('id,title,image_url,link,active,start_date,end_date,products,company_id,category_id,main_category_id')
        .eq('id', id)
        .maybeSingle();

      if (bannerError) throw bannerError;
      if (!bannerData) throw new Error('Banner not found');

      const currentBanner = bannerData as unknown as BannerRow;
      setBanner(currentBanner);
      if (!isCurrentBanner(currentBanner)) return;

      let productsData: Product[] = [];
      const explicitIds = Array.isArray(currentBanner.products) ? currentBanner.products.filter(Boolean) : [];

      if (explicitIds.length > 0) {
        const resolved = await Promise.all(explicitIds.map(productId => getProductById(productId)));
        productsData = resolved.filter((product): product is Product => Boolean(product));
        setSourceLabel('اختيارات البانر');
      } else if (currentBanner.company_id) {
        const [branchProducts, { data: companyData }] = await Promise.all([
          getProductsByCompany(currentBanner.company_id),
          supabase.from('companies').select('name').eq('id', currentBanner.company_id).maybeSingle(),
        ]);
        productsData = branchProducts;
        setSourceLabel(companyData?.name ? `منتجات ${companyData.name}` : 'منتجات الشركة');
      } else {
        const categoryId = currentBanner.main_category_id || currentBanner.category_id;
        if (categoryId) {
          const [branchProducts, { data: categoryData }] = await Promise.all([
            getProducts(categoryId, false),
            supabase.from('main_categories').select('name').eq('id', categoryId).maybeSingle(),
          ]);
          productsData = branchProducts;
          setSourceLabel(categoryData?.name ? `منتجات ${categoryData.name}` : 'منتجات القسم');
        }
      }

      setAllProducts(expandProductSaleUnits(productsData));
    } catch (loadError) {
      console.error('Error loading banner page:', loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const title = banner && hasUsefulTitle(banner.title) ? banner.title.trim() : 'اختيارات المعداوي';
  const available = banner ? isCurrentBanner(banner) : false;

  const products = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ar');
    let result = query
      ? allProducts.filter(product => displayProductName(product).toLocaleLowerCase('ar').includes(query))
      : [...allProducts];

    if (sort === 'price_asc') result = result.sort((a, b) => displayProductPrice(a) - displayProductPrice(b));
    if (sort === 'price_desc') result = result.sort((a, b) => displayProductPrice(b) - displayProductPrice(a));
    if (sort === 'name_asc') result = result.sort((a, b) => displayProductName(a).localeCompare(displayProductName(b), 'ar'));
    return result;
  }, [allProducts, search, sort]);

  return (
    <MainLayout>
      <SEOHead
        title={`${title} - سوبر ماركو`}
        description={`تسوق ${sourceLabel} من سوبر ماركو`}
        image={banner?.image_url || undefined}
        type="product.group"
      />
      {products.length > 0 && <ProductListStructuredData products={products} listName={title} />}

      <TopNavBar hideLogo hideSearch hideCart pageTitle={title} showBackButton onBack={() => navigate(-1)} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center"><BrandLoader label="جاري تحميل العرض" /></div>
        ) : error || !banner ? (
          <section role="alert" className="mx-auto max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600"><ImageIcon size={30} /></span>
            <h1 className="mt-4 text-xl font-bold">تعذر تحميل البانر</h1>
            <p className="mt-2 text-sm text-gray-500">راجع اتصالك وحاول مرة تانية.</p>
            <Button className="mt-5 rounded-xl" onClick={() => void load()}>إعادة المحاولة</Button>
          </section>
        ) : !available ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400"><Sparkles size={30} /></span>
            <h1 className="mt-4 text-xl font-bold">العرض غير متاح حاليًا</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">العرض انتهى أو لسه موعده مجاش. تقدر تكمل تصفح باقي المنتجات.</p>
            <Button className="mt-5 rounded-xl" onClick={() => navigate('/')}>العودة للرئيسية</Button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="relative aspect-[16/7] min-h-44 overflow-hidden bg-gray-50 sm:aspect-[16/5]">
                <img
                  src={banner.image_url || '/placeholder.svg'}
                  alt={title}
                  className="h-full w-full object-cover"
                  loading="eager"
                  onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-5 pb-5 pt-16 text-white sm:px-7 sm:pb-7">
                  <p className="text-xs font-semibold text-white/80">عرض من المعداوي</p>
                  <h1 className="mt-1 text-2xl font-bold leading-relaxed sm:text-3xl">{title}</h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div>
                  <p className="text-xs text-gray-500">المجموعة</p>
                  <p className="mt-1 font-bold text-gray-900">{sourceLabel}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-primary">
                  <Package size={17} />{allProducts.length.toLocaleString('ar-EG')} اختيار متاح في فرعك
                </span>
              </div>
            </section>

            {allProducts.length > 0 && (
              <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="relative flex-1">
                    <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
                    <input
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="دور في منتجات العرض"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-10 pl-3 text-sm outline-none transition focus:border-primary focus:bg-white"
                    />
                  </label>
                  <label className="relative sm:w-56">
                    <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                    <select value={sort} onChange={event => setSort(event.target.value as SortType)} className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white pr-10 pl-3 text-sm font-semibold outline-none focus:border-primary">
                      <option value="default">ترتيب العرض</option>
                      <option value="price_asc">السعر: الأقل أولًا</option>
                      <option value="price_desc">السعر: الأعلى أولًا</option>
                      <option value="name_asc">الاسم: أ - ي</option>
                    </select>
                  </label>
                </div>
              </section>
            )}

            {products.length > 0 ? (
              <section>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div><p className="text-xs text-gray-500">القطعة والجملة داخل العرض</p><h2 className="mt-1 text-xl font-bold">{sourceLabel}</h2></div>
                  <span className="text-sm font-semibold text-gray-500">{products.length.toLocaleString('ar-EG')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {products.map(product => <ProductCard key={productCardKey(product)} product={product} />)}
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400"><Package size={30} /></span>
                <h2 className="mt-4 text-xl font-bold">{search.trim() ? 'مفيش منتجات بالاسم ده' : 'مفيش منتجات متاحة في فرعك ضمن العرض'}</h2>
                <p className="mt-2 text-sm text-gray-500">{search.trim() ? 'جرّب بحث مختلف.' : 'المنتجات هتظهر هنا لما تكون متوفرة في مخزون فرع التوصيل.'}</p>
                {search.trim() && <Button variant="outline" className="mt-5 rounded-xl" onClick={() => setSearch('')}>مسح البحث</Button>}
              </section>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BannerProducts;