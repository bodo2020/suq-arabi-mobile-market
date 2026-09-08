import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Package, Scale, Plus, Minus, Share2, ShoppingCart } from 'lucide-react';
import TopNavBar from '@/components/layout/TopNavBar';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import WeightedPurchaseControl from '@/components/ui/WeightedPurchaseControl';
import ProductStructuredData from '@/components/seo/ProductStructuredData';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/useCart';
import { Product, getProductById, getRelatedProducts, getCompanyById, Company } from '@/lib/supabase';
import { formatWeightAmount, hasBulkPurchase, isWeightedProduct, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';

const money = (value: number) => Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedBulk = searchParams.get('unit') === 'bulk';
  const requestedVariantId = searchParams.get('variant');

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [detailWeight, setDetailWeight] = useState(0);
  const { addToCart, items, updateQuantity, isInitialized } = useCart();
  const { toast } = useToast();

  const weighted = product ? isWeightedProduct(product) : false;
  const bulkAvailable = product ? hasBulkPurchase(product) : false;
  const variantMatches = !requestedVariantId || product?.bulk_variant_id === requestedVariantId;
  const bulkMode = Boolean(product && requestedBulk && bulkAvailable && variantMatches);
  const unitPrice = product ? productUnitPrice(product) : 0;
  const pack = product ? Number(product.bulk_quantity || 1) : 1;
  const packNumber = String(Math.max(1, Math.trunc(pack)));
  const bulkImageUrl = product ? String(product.bulk_image_url || '').trim() : '';
  const bulkUnitType = product
    ? (String((product as Product & { bulk_variant_type?: string | null }).bulk_variant_type || '').trim() || 'جملة')
    : 'جملة';
  const displayName = product
    ? bulkMode
      ? (String(product.bulk_name || '').trim() || product.name)
      : product.name
    : '';
  const favoriteVariantId = bulkMode ? product?.bulk_variant_id || null : null;
  const regularCartItem = items.find(item => item.product.id === id && !item.is_bulk && item.unit_of_measure !== 'weight');
  const weightedCartItem = items.find(item => item.product.id === id && !item.is_bulk && item.unit_of_measure === 'weight');
  const bulkCartItem = items.find(item => item.product.id === id && item.is_bulk);
  const currentWeight = weighted && product
    ? Math.max(1, Math.round(Number(weightedCartItem?.quantity || detailWeight || productWeightStepGrams(product))))
    : 0;
  const displayPrice = product
    ? bulkMode
      ? Number(product.bulk_price || 0)
      : weighted
        ? unitPrice * currentWeight / 1000
        : unitPrice
    : 0;
  const originalWeightedPrice = product && weighted
    ? Number(product.price || 0) * currentWeight / 1000
    : 0;

  useEffect(() => {
    let active = true;

    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(false);
      setProduct(null);
      setSelectedImageIndex(0);
      setRelatedProducts([]);
      setCompany(null);
      setQuantity(1);
      setDetailWeight(0);

      try {
        const data = await getProductById(id);
        if (!data) throw new Error('PRODUCT_NOT_FOUND');
        if (active) {
          const typed = data as Product;
          setProduct(typed);
          if (isWeightedProduct(typed)) setDetailWeight(productWeightStepGrams(typed));
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchProduct();
    return () => { active = false; };
  }, [id, requestedBulk, requestedVariantId]);

  useEffect(() => {
    if (!product) return;
    let active = true;

    const loadExtras = async () => {
      const [related, companyData] = await Promise.allSettled([
        getRelatedProducts(product.id, product.main_category_id),
        product.company_id ? getCompanyById(product.company_id) : Promise.resolve(null),
      ]);

      if (!active) return;
      if (related.status === 'fulfilled') setRelatedProducts((related.value || []) as Product[]);
      if (companyData.status === 'fulfilled') setCompany(companyData.value as Company | null);
    };

    void loadExtras();
    return () => { active = false; };
  }, [product]);

  const images = useMemo(() => {
    if (!product) return [];
    if (bulkMode) return bulkImageUrl ? [bulkImageUrl] : [];
    return product.image_urls?.filter(Boolean) || [];
  }, [product, bulkMode, bulkImageUrl]);

  const structuredProduct = useMemo(() => {
    if (!product || !bulkMode) return product;
    return {
      ...product,
      name: displayName,
      price: Number(product.bulk_price || 0),
      offer_price: undefined,
      image_urls: bulkImageUrl ? [bulkImageUrl] : [],
    } as Product;
  }, [product, bulkMode, displayName, bulkImageUrl]);

  const notifyAdded = () => toast({ title: 'تمت الإضافة', description: `اتضاف ${displayName || 'المنتج'} للسلة.` });

  const addRegular = () => {
    if (!product || !isInitialized) return;
    addToCart({ ...product, price: product.price, quantity, is_bulk: false });
    setQuantity(1);
    notifyAdded();
  };

  const addBulk = () => {
    if (!product || !isInitialized || !bulkMode) return;
    addToCart({
      ...product,
      name: displayName,
      image_urls: bulkImageUrl ? [bulkImageUrl] : [],
      price: product.price,
      quantity: 1,
      is_bulk: true,
    });
    notifyAdded();
  };

  const changeCartQuantity = (bulk: boolean, delta: number) => {
    if (!product || !isInitialized) return;
    const item = bulk ? bulkCartItem : regularCartItem;
    if (!item) return;
    updateQuantity(product.id, item.quantity + delta, bulk);
  };

  const handleShare = async () => {
    if (!product) return;
    const { getCurrentUrl } = await import('@/utils/urlUtils');
    const shareUrl = getCurrentUrl();

    if (navigator.share) {
      try {
        await navigator.share({ title: displayName, text: product.description || '', url: shareUrl });
        return;
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'تم النسخ', description: 'تم نسخ رابط المنتج.' });
    } catch {
      toast({ title: 'تعذر النسخ', description: 'حاول مرة تانية.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <TopNavBar pageTitle="تفاصيل المنتج" showBackButton onBack={() => navigate(-1)} />
        <div className="flex min-h-[60vh] items-center justify-center"><BrandLoader size="md" /></div>
      </MainLayout>
    );
  }

  const invalidBulkPage = Boolean(product && requestedBulk && (!bulkAvailable || !variantMatches));

  if (!product || loadError || invalidBulkPage) {
    return (
      <MainLayout>
        <TopNavBar pageTitle={requestedBulk ? 'تفاصيل الجملة' : 'تفاصيل المنتج'} showBackButton onBack={() => navigate(-1)} />
        <section className="mx-auto mt-10 max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
          <Package className="mx-auto text-gray-300" size={42} />
          <h1 className="mt-4 text-xl font-bold">{requestedBulk ? 'وحدة الجملة مش متاحة دلوقتي' : 'المنتج مش متاح دلوقتي'}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">ارجع للمنتجات واختار بديل، أو جرّب فتح الصفحة تاني.</p>
          <Button className="mt-5 rounded-xl" onClick={() => navigate(-1)}>رجوع</Button>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEOHead
        title={`${displayName} - المعداوي`}
        description={product.description || `اشتري ${displayName} من المعداوي`}
        image={images[0]}
        type="product"
      />
      {structuredProduct && <ProductStructuredData product={structuredProduct} />}
      <BreadcrumbStructuredData items={[
        { name: 'الرئيسية', url: '/' },
        { name: bulkMode ? 'منتجات الجملة' : 'المنتجات', url: bulkMode ? '/bulk-products' : '/categories' },
        { name: displayName, url: bulkMode ? `/product/${product.id}?unit=bulk` : `/product/${product.id}` },
      ]} />

      <TopNavBar pageTitle={displayName} showBackButton onBack={() => navigate(-1)} />

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <section className="relative rounded-3xl border border-gray-100 bg-white p-4 sm:p-6">
            <div className={`relative aspect-square overflow-hidden rounded-2xl ${bulkMode && !bulkImageUrl ? 'bg-emerald-50/70' : 'bg-gray-50'}`}>
              {bulkMode && !bulkImageUrl ? (
                <div className="flex h-full w-full items-center justify-center p-8" aria-label={`${bulkUnitType} ${packNumber} قطعة`}>
                  <div className="flex aspect-square w-[52%] max-w-56 items-center justify-center rounded-[24%] border border-white/20 bg-[#005931] shadow-[0_18px_44px_rgba(0,89,49,0.22)]">
                    <span className="select-none text-6xl font-black leading-none tracking-tight text-white sm:text-7xl">{packNumber}</span>
                  </div>
                </div>
              ) : (
                <img
                  src={images[selectedImageIndex] || '/placeholder.svg'}
                  alt={displayName}
                  className="h-full w-full object-contain p-6"
                  onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
                />
              )}
              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <button onClick={handleShare} aria-label="مشاركة المنتج" className="rounded-full bg-white/95 p-2 shadow-md">
                  <Share2 className="h-5 w-5 text-gray-700" />
                </button>
                <div className="rounded-full bg-white/95 shadow-md">
                  <FavoriteButton productId={product.id} variantId={favoriteVariantId} size="sm" />
                </div>
              </div>
            </div>

            {!bulkMode && images.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {images.map((url, index) => (
                  <button
                    key={url}
                    aria-label={`عرض صورة ${index + 1}`}
                    aria-pressed={selectedImageIndex === index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${selectedImageIndex === index ? 'border-primary' : 'border-gray-200'}`}
                  >
                    <img src={url} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold leading-relaxed text-gray-900 sm:text-3xl">{displayName}</h1>
                {bulkMode ? (
                  <p className="mt-2 text-sm text-gray-500">{bulkUnitType} · {packNumber} قطعة</p>
                ) : !weighted ? (
                  <p className="mt-2 text-sm text-gray-500">اختار الكمية المناسبة ليك</p>
                ) : null}
              </div>
              {bulkMode ? (
                <Badge variant="secondary" className="shrink-0 gap-1 bg-green-50 text-[#005931]"><Package size={14} />{bulkUnitType}</Badge>
              ) : weighted ? (
                <Badge variant="secondary" className="shrink-0 gap-1"><Scale size={14} />بالميزان</Badge>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl bg-green-50/70 p-4">
              {!bulkMode && Number(product.offer_price || 0) > 0 && Number(product.offer_price) < Number(product.price) && (
                <span className="block text-sm text-gray-400 line-through">
                  {money(weighted ? originalWeightedPrice : Number(product.price || 0))} ج.م
                </span>
              )}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-3xl font-bold text-primary">{money(displayPrice)} ج.م</span>
                {!bulkMode && weighted && (
                  <span className="text-sm font-semibold text-primary">/ {formatWeightAmount(currentWeight)}</span>
                )}
              </div>
              {bulkMode && (
                <span className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#005931] shadow-sm">
                  <Package size={16} />{bulkUnitType} · {packNumber} قطعة
                </span>
              )}

              {company && (
                <button onClick={() => navigate(`/company/${company.id}`)} className="mt-3 block text-sm font-semibold text-primary underline underline-offset-4">
                  عرض منتجات {company.name}
                </button>
              )}
            </div>

            <div className="mt-6">
              {bulkMode ? (
                <div className="rounded-2xl border border-green-100 bg-green-50/35 p-4">
                  <div className="mb-3 flex items-center gap-2 font-bold text-[#005931]"><Package size={19} />شراء {bulkUnitType}</div>
                  {bulkCartItem ? (
                    <div className="flex min-h-12 items-center justify-between rounded-xl bg-white text-[#005931] shadow-sm">
                      <button onClick={() => changeCartQuantity(true, -1)} className="flex h-12 w-12 items-center justify-center" aria-label={`تقليل عدد ${bulkUnitType}`}><Minus size={18} /></button>
                      <strong>{money(bulkCartItem.quantity)} {bulkUnitType}</strong>
                      <button onClick={() => changeCartQuantity(true, 1)} className="flex h-12 w-12 items-center justify-center" aria-label={`زيادة عدد ${bulkUnitType}`}><Plus size={18} /></button>
                    </div>
                  ) : (
                    <Button onClick={addBulk} className="flex min-h-12 w-full items-center justify-between rounded-xl px-4" disabled={!isInitialized}>
                      <span className="flex items-center gap-2 font-semibold"><Package size={17} />إضافة للسلة</span>
                      <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold">سعر {bulkUnitType} {money(displayPrice)} ج.م</span>
                    </Button>
                  )}
                </div>
              ) : weighted ? (
                <WeightedPurchaseControl product={product} onWeightChange={setDetailWeight} />
              ) : (
                <div className="rounded-2xl border border-gray-100 p-4">
                  <div className="mb-3 font-bold">شراء بالقطعة</div>
                  {regularCartItem ? (
                    <div className="flex min-h-12 items-center justify-between rounded-xl bg-green-50 text-primary">
                      <button onClick={() => changeCartQuantity(false, -1)} className="flex h-12 w-12 items-center justify-center" aria-label="تقليل الكمية"><Minus size={18} /></button>
                      <strong>{money(regularCartItem.quantity)} قطعة</strong>
                      <button onClick={() => changeCartQuantity(false, 1)} className="flex h-12 w-12 items-center justify-center" aria-label="زيادة الكمية"><Plus size={18} /></button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex min-h-12 items-center justify-between rounded-xl border border-gray-200">
                        <button onClick={() => setQuantity(value => Math.max(1, value - 1))} className="flex h-12 w-12 items-center justify-center" aria-label="تقليل الكمية"><Minus size={18} /></button>
                        <strong>{money(quantity)}</strong>
                        <button onClick={() => setQuantity(value => value + 1)} className="flex h-12 w-12 items-center justify-center" aria-label="زيادة الكمية"><Plus size={18} /></button>
                      </div>
                      <Button onClick={addRegular} className="flex min-h-12 w-full items-center justify-between rounded-xl px-4" disabled={!isInitialized}>
                        <span className="font-semibold">إضافة للسلة</span>
                        <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold">الإجمالي {money(unitPrice * quantity)} ج.م</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => navigate('/cart')} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 font-semibold text-primary">
              <ShoppingCart size={18} />مراجعة السلة ومتابعة الطلب
            </button>
          </section>
        </div>

        {product.description && (
          <section className="mt-5 rounded-3xl border border-gray-100 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold">عن المنتج</h2>
            <p className="whitespace-pre-line leading-8 text-gray-600">{product.description}</p>
          </section>
        )}

        {relatedProducts.length > 0 && (
          <section className="mt-5 rounded-3xl border border-gray-100 bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-xl font-bold">منتجات ذات صلة</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {relatedProducts.map(relatedProduct => <ProductCard key={relatedProduct.id} product={relatedProduct} />)}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
};

export default ProductDetail;
