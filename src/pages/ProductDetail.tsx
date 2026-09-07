import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Scale, Plus, Minus, Share2, ShoppingCart, ShieldCheck } from 'lucide-react';
import TopNavBar from '@/components/layout/TopNavBar';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import WeightSelector from '@/components/ui/WeightSelector';
import ProductStructuredData from '@/components/seo/ProductStructuredData';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/useCart';
import { Product, getProductById, getRelatedProducts, getCompanyById, Company } from '@/lib/supabase';
import { hasBulkPurchase, isWeightedProduct, productUnitPrice } from '@/lib/productPurchase';

const money = (value: number) => Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWeightSelectorOpen, setIsWeightSelectorOpen] = useState(false);
  const { addToCart, items, updateQuantity, isInitialized } = useCart();
  const { toast } = useToast();

  const weighted = product ? isWeightedProduct(product) : false;
  const bulkAvailable = product ? hasBulkPurchase(product) : false;
  const unitPrice = product ? productUnitPrice(product) : 0;
  const regularCartItem = items.find(item => item.product.id === id && !item.is_bulk && item.unit_of_measure !== 'weight');
  const bulkCartItem = items.find(item => item.product.id === id && item.is_bulk);

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

      try {
        const data = await getProductById(id);
        if (!data) throw new Error('PRODUCT_NOT_FOUND');
        if (active) setProduct(data as Product);
      } catch (error) {
        console.error('Error fetching product:', error);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchProduct();
    return () => { active = false; };
  }, [id]);

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

  const images = useMemo(() => product?.image_urls?.filter(Boolean) || [], [product?.image_urls]);

  const notifyAdded = () => toast({ title: 'تمت الإضافة', description: 'اتضاف المنتج للسلة.' });

  const addRegular = () => {
    if (!product || !isInitialized) return;
    if (weighted) {
      setIsWeightSelectorOpen(true);
      return;
    }
    addToCart({ ...product, price: product.price, quantity, is_bulk: false });
    setQuantity(1);
    notifyAdded();
  };

  const addBulk = () => {
    if (!product || !isInitialized || !bulkAvailable) return;
    addToCart({ ...product, price: Number(product.bulk_price || 0), quantity: 1, is_bulk: true });
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
        await navigator.share({ title: product.name, text: product.description || '', url: shareUrl });
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

  if (!product || loadError) {
    return (
      <MainLayout>
        <TopNavBar pageTitle="تفاصيل المنتج" showBackButton onBack={() => navigate(-1)} />
        <section className="mx-auto mt-10 max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
          <Package className="mx-auto text-gray-300" size={42} />
          <h1 className="mt-4 text-xl font-bold">المنتج مش متاح دلوقتي</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">ارجع للمنتجات واختار بديل، أو جرّب فتح الصفحة تاني.</p>
          <Button className="mt-5 rounded-xl" onClick={() => navigate(-1)}>رجوع</Button>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEOHead
        title={`${product.name} - المعداوي`}
        description={product.description || `اشتري ${product.name} من المعداوي`}
        image={images[0]}
        type="product"
      />
      <ProductStructuredData product={product} />
      <BreadcrumbStructuredData items={[
        { name: 'الرئيسية', url: '/' },
        { name: 'المنتجات', url: '/categories' },
        { name: product.name, url: `/product/${product.id}` },
      ]} />

      <TopNavBar pageTitle={product.name} showBackButton onBack={() => navigate(-1)} />

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <section className="relative rounded-3xl border border-gray-100 bg-white p-4 sm:p-6">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-50">
              <img
                src={images[selectedImageIndex] || '/placeholder.svg'}
                alt={product.name}
                className="h-full w-full object-contain p-6"
                onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
              />
              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <button onClick={handleShare} aria-label="مشاركة المنتج" className="rounded-full bg-white/95 p-2 shadow-md">
                  <Share2 className="h-5 w-5 text-gray-700" />
                </button>
                <div className="rounded-full bg-white/95 shadow-md"><FavoriteButton productId={product.id} size="sm" /></div>
              </div>
            </div>

            {images.length > 1 && (
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
                <h1 className="text-2xl font-bold leading-relaxed text-gray-900 sm:text-3xl">{product.name}</h1>
                <p className="mt-2 text-sm text-gray-500">{weighted ? 'اختار الوزن المناسب ليك' : 'اختار الكمية المناسبة ليك'}</p>
              </div>
              {weighted && <Badge variant="secondary" className="shrink-0 gap-1"><Scale size={14} />بالميزان</Badge>}
            </div>

            <div className="mt-5 rounded-2xl bg-green-50/70 p-4">
              {Number(product.offer_price || 0) > 0 && Number(product.offer_price) < Number(product.price) && (
                <span className="block text-sm text-gray-400 line-through">{money(product.price)} ج.م</span>
              )}
              <span className="block text-3xl font-bold text-primary">
                {money(unitPrice)} ج.م{weighted ? ' / كجم' : ''}
              </span>

              {bulkAvailable && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#005931] shadow-sm">
                  <Package size={16} />عبوة {money(Number(product.bulk_quantity || 1))} قطعة · {money(Number(product.bulk_price || 0))} ج.م
                </div>
              )}

              {company && (
                <button onClick={() => navigate(`/company/${company.id}`)} className="mt-3 block text-sm font-semibold text-primary underline underline-offset-4">
                  عرض منتجات {company.name}
                </button>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-green-100 bg-white p-3 text-xs leading-6 text-gray-600">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
              <span>التوفر النهائي بيتأكد من مخزون فرع عنوان التوصيل قبل تأكيد الطلب.</span>
            </div>

            <div className="mt-6 space-y-4">
              {weighted ? (
                <div className="rounded-2xl border border-gray-100 p-4">
                  <div className="mb-3 flex items-center gap-2 font-bold"><Scale size={19} className="text-primary" />شراء بالوزن</div>
                  <Button onClick={() => setIsWeightSelectorOpen(true)} className="min-h-12 w-full rounded-xl" disabled={!isInitialized}>
                    {items.some(item => item.product.id === product.id && item.unit_of_measure === 'weight' && !item.is_bulk) ? 'تعديل الوزن في السلة' : 'اختيار الوزن'}
                  </Button>
                </div>
              ) : (
                <>
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
                        <Button onClick={addRegular} className="min-h-12 w-full rounded-xl" disabled={!isInitialized}>إضافة للسلة · {money(unitPrice * quantity)} ج.م</Button>
                      </div>
                    )}
                  </div>

                  {bulkAvailable && (
                    <div className="rounded-2xl border border-green-100 bg-green-50/40 p-4">
                      <div className="mb-3 flex items-center gap-2 font-bold text-[#005931]"><Package size={19} />شراء جملة</div>
                      <p className="mb-3 text-xs leading-5 text-gray-600">العبوة فيها {money(Number(product.bulk_quantity || 1))} قطعة بسعر {money(Number(product.bulk_price || 0))} ج.م.</p>
                      {bulkCartItem ? (
                        <div className="flex min-h-12 items-center justify-between rounded-xl bg-white text-[#005931] shadow-sm">
                          <button onClick={() => changeCartQuantity(true, -1)} className="flex h-12 w-12 items-center justify-center" aria-label="تقليل عبوات الجملة"><Minus size={18} /></button>
                          <strong>{money(bulkCartItem.quantity)} عبوة</strong>
                          <button onClick={() => changeCartQuantity(true, 1)} className="flex h-12 w-12 items-center justify-center" aria-label="زيادة عبوات الجملة"><Plus size={18} /></button>
                        </div>
                      ) : (
                        <Button onClick={addBulk} variant="secondary" className="min-h-12 w-full rounded-xl bg-[#d3ffb3] text-[#005931] hover:bg-[#c3ef93]" disabled={!isInitialized}>
                          <Package size={17} className="ml-2" />إضافة عبوة جملة
                        </Button>
                      )}
                    </div>
                  )}
                </>
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

        {weighted && <WeightSelector product={product} isOpen={isWeightSelectorOpen} onClose={() => setIsWeightSelectorOpen(false)} />}

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
