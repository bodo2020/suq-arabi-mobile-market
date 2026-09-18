import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BadgePercent, Check, Package, Plus, Minus, Trash2, ShoppingBag, Scale, AlertCircle, RefreshCw, Clock3 } from 'lucide-react';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import BrandLoader from '@/components/ui/BrandLoader';
import WeightSelector from '@/components/ui/WeightSelector';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';
import { useBranch } from '@/contexts/BranchContext';
import { CartItem, cartItemIdentity, isCombinedCart, isSingleMarketplaceCart } from '@/contexts/cartTypes';
import { cartQuoteError, quoteCart, type CartQuoteLine } from '@/lib/cartQuote';
import { formatWeightAmount, productWeightStepGrams } from '@/lib/productPurchase';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
const localItemPrice = (item: CartItem) => item.is_bulk ? item.product.bulk_price || 0 : item.product.offer_price || item.product.price || 0;
const localItemTotal = (item: CartItem) => localItemPrice(item) * item.quantity / (item.unit_of_measure === 'weight' && !item.is_bulk ? 1000 : 1);
const itemKey = (item: CartItem) => `${item.product.id}:${!!item.is_bulk}:${item.unit_of_measure === 'weight' ? 'weight' : 'piece'}`;
const quoteLineKey = (line: CartQuoteLine) => `${line.product_id}:${!!line.is_bulk}:${line.unit_of_measure}`;

export default function Cart() {
  const { items, updateQuantity, removeFromCart, getTotalPrice, isInitialized, syncError, isSaving, retrySync } = useCart();
  const { user, authLoading } = useUser();
  const { branch, branchLoading, branchError, refreshBranch } = useBranch();
  const navigate = useNavigate();
  const [weightItem, setWeightItem] = useState<CartItem | null>(null);

  const quoteSignature = useMemo(
    () => items.map(item => `${cartItemIdentity(item)}:${item.quantity}`).sort().join('|'),
    [items],
  );

  const quoteQuery = useQuery({
    queryKey: ['cart-server-quote', branch?.delivery_branch_id, user?.id || 'guest', quoteSignature],
    queryFn: () => quoteCart(items),
    enabled: isInitialized && items.length > 0 && Boolean(branch) && !branchLoading,
    retry: 1,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const quote = quoteQuery.data;
  const quoteLines = useMemo(
    () => new Map((quote?.items || []).map(line => [quoteLineKey(line), line])),
    [quote?.items],
  );

  const quoteError = quoteQuery.error ? cartQuoteError(quoteQuery.error) : null;
  const quotePending = quoteQuery.isLoading || quoteQuery.isFetching;
  const serverReady = Boolean(quote) && !quotePending && !quoteError;
  const blocked = !isInitialized || authLoading || !!syncError || isSaving || branchLoading || !!branchError || !branch || !serverReady;

  const combinedCart = isCombinedCart(items);
  const marketplaceCart = isSingleMarketplaceCart(items);

  const proceed = () => {
    if (blocked) return;
    const target = combinedCart ? '/combined-payment' : marketplaceCart ? '/marketplace-payment' : '/payment';
    navigate(user ? target : `/phone-login?returnTo=${encodeURIComponent(target)}`);
  };

  const retryQuote = async () => {
    await refreshBranch();
    await quoteQuery.refetch();
  };

  const cta = <Button className="cart-primary" onClick={proceed} disabled={blocked}>
    {isSaving ? <><BrandLoader size="sm" />جارٍ حفظ سلتك</> : quotePending ? <><BrandLoader size="sm" />بنحسب الطريق والأسعار</> : <>متابعة الطلب<ArrowLeft size={18} /></>}
  </Button>;

  const subtotal = Number(quote?.subtotal ?? getTotalPrice());
  const shipping = Number(quote?.shipping_cost ?? branch?.delivery_fee ?? 0);
  const total = Number(quote?.total ?? subtotal + shipping);
  const deliveryEtaStart = Math.max(
    10,
    Math.round(Number(quote?.estimated_delivery_minutes || branch?.estimated_delivery_minutes || 45) / 5) * 5,
  );
  const deliveryEtaEnd = deliveryEtaStart + 5;

  return <CheckoutLayout>
    {syncError && <div role="alert" className="cart-alert"><AlertCircle size={20} /><span>{syncError}</span><Button variant="outline" onClick={retrySync}>إعادة المحاولة</Button></div>}
    {(branchError || quoteError) && <div role="alert" className="cart-alert"><AlertCircle size={20} /><span>{branchError || quoteError}</span><Button variant="outline" onClick={() => void retryQuote()}><RefreshCw size={16} />إعادة المراجعة</Button></div>}

    {!isInitialized ? <div className="cart-loading"><BrandLoader size="lg" /><span>{syncError ? 'سلتك المحفوظة لم تُحمّل بعد' : 'بنجهّز سلتك'}</span></div> : !items.length ?
      <section className="cart-empty"><div className="cart-empty-mark"><ShoppingBag size={38} /></div><h1>سلتك مستنية اختياراتك</h1><p>ضيف احتياجاتك، وهتلاقيها كلها هنا.<br />تقدر تتسوّق وتختار براحتك قبل تسجيل الدخول.</p><Button asChild className="cart-primary"><Link to="/">ابدأ التسوّق<ArrowLeft size={18} /></Link></Button></section> : <>
      <div className="cart-heading">
        <div><h1>سلتك، على ذوقك.</h1><p>{money(items.length)} أصناف · راجع اختياراتك وكمّل طلبك</p></div>
        <div className="cart-status" role="status">{isSaving ? <><BrandLoader size="sm" />جارٍ الحفظ</> : quotePending ? <><BrandLoader size="sm" />تحديث الطريق والسعر والمخزون</> : syncError ? 'التعديل لم يُحفظ بعد' : user ? <><Check size={16} />سلتك محفوظة</> : 'سلة الضيف جاهزة'}</div>
      </div>

      {branch && <div className="cart-alert" role="status">
        <Clock3 size={18} />
        <span>
          {combinedCart && quote?.stores_count ? <>طلب مجمّع من <strong>{money(quote.stores_count)} متاجر</strong> · </> : marketplaceCart && quote?.merchant_name ? <>طلب من <strong>{quote.merchant_name}</strong> · </> : null}
          متوقع التوصيل خلال <strong>{money(deliveryEtaStart)}–{money(deliveryEtaEnd)} دقيقة</strong>
        </span>
      </div>}

      {quote?.delivery_campaign && Number(quote.delivery_campaign.discount || 0) > 0 && <div className="cart-alert" role="status">
        <BadgePercent size={18} />
        <span><strong>{quote.delivery_campaign.name}</strong> · وفّرت {money(Number(quote.delivery_campaign.discount || 0))} ج.م من التوصيل</span>
      </div>}

      <div className="cart-grid"><section className="cart-list" aria-label="منتجات السلة">
        {items.map(item => {
          const line = quoteLines.get(itemKey(item));
          const unitPrice = Number(line?.price ?? localItemPrice(item));
          const lineTotal = Number(line?.total ?? localItemTotal(item));
          const availableStock = Number(line?.available_stock ?? item.product.quantity ?? 0);
          const bulkQty = Number(line?.bulk_quantity ?? item.product.bulk_quantity ?? 1);
          const isWeight = item.unit_of_measure === 'weight' && !item.is_bulk;
          const bulkUnitType = item.is_bulk
            ? (String((item.product as typeof item.product & { bulk_variant_type?: string | null }).bulk_variant_type || '').trim() || 'جملة')
            : '';
          const bulkVariantId = item.is_bulk ? item.product.bulk_variant_id || null : null;
          const productHref = item.is_bulk
            ? `/product/${item.product.id}?unit=bulk${bulkVariantId ? `&variant=${encodeURIComponent(bulkVariantId)}` : ''}`
            : `/product/${item.product.id}`;
          const weightStep = isWeight ? productWeightStepGrams(item.product) : 0;
          const maxQuantity = isWeight
            ? Math.floor(availableStock * 1000)
            : item.is_bulk
              ? Math.floor(availableStock / Math.max(1, bulkQty))
              : Math.floor(availableStock);
          const atLimit = serverReady && item.quantity >= maxQuantity;
          const weightCanIncrease = isWeight && serverReady && item.quantity < maxQuantity;
          const openWeightEditor = () => setWeightItem({
            ...item,
            product: { ...item.product, quantity: availableStock },
          });

          return <article key={cartItemIdentity(item)} className="cart-line">
            <Link className="cart-image" to={productHref} tabIndex={-1} aria-hidden="true"><img src={item.product.image_urls?.[0] || '/placeholder.svg'} alt="" loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }} /></Link>
            <div>
              <div className="cart-line-heading">
                <div><Link to={productHref} className="cart-product-name">{item.product.name}</Link><div className="mt-1 text-[11px] font-bold text-primary">{item.commerce_source === 'marketplace' ? (item.merchant_name || item.marketplace_branch_name || 'متجر شريك') : 'ماركت المعداوي'}</div><div className="cart-kind">{item.is_bulk ? <><Package size={14} />{bulkUnitType} · {money(bulkQty)} قطعة</> : isWeight ? <><Scale size={14} />بالوزن · الخطوة {formatWeightAmount(weightStep)}</> : 'بالقطعة'}</div></div>
                <button className="cart-remove" onClick={() => removeFromCart(item.product.id, !!item.is_bulk)} aria-label={`حذف ${item.product.name}`}><Trash2 size={18} /></button>
              </div>
              <p className="cart-unit-price">{money(unitPrice)} ج.م {item.is_bulk ? `/ ${bulkUnitType}` : isWeight ? '/ كجم' : '/ قطعة'}{line && <span className="mr-2 text-[11px] text-primary">سعر الفرع</span>}</p>
              <div className="cart-line-bottom">
                {isWeight ? (
                  <div className="cart-counter">
                    <button
                      disabled={!weightCanIncrease}
                      aria-label={atLimit ? `وصلت للوزن المتاح من ${item.product.name}` : `زيادة الوزن بمقدار ${formatWeightAmount(weightStep)}`}
                      onClick={() => updateQuantity(item.product.id, Math.min(maxQuantity, item.quantity + weightStep), false)}
                    ><Plus size={17} /></button>
                    <button
                      type="button"
                      onClick={openWeightEditor}
                      aria-label={`تعديل وزن ${item.product.name}، الوزن الحالي ${formatWeightAmount(item.quantity)}`}
                      className="min-w-[86px] px-2 text-sm font-bold text-primary"
                    >{formatWeightAmount(item.quantity)}</button>
                    <button
                      aria-label={item.quantity <= weightStep ? `حذف ${item.product.name}` : `تقليل الوزن بمقدار ${formatWeightAmount(weightStep)}`}
                      onClick={() => item.quantity <= weightStep
                        ? removeFromCart(item.product.id, false)
                        : updateQuantity(item.product.id, Math.max(1, item.quantity - weightStep), false)}
                    >{item.quantity <= weightStep ? <Trash2 size={16} /> : <Minus size={17} />}</button>
                  </div>
                ) : <div className="cart-counter">
                  <button disabled={atLimit || !serverReady} aria-label={atLimit ? `وصلت للكمية المتاحة من ${item.product.name}` : `زيادة كمية ${item.product.name}`} onClick={() => updateQuantity(item.product.id, item.quantity + 1, !!item.is_bulk)}><Plus size={17} /></button>
                  <output aria-label={`كمية ${item.product.name}`} aria-live="polite">{money(item.quantity)}</output>
                  <button aria-label={item.quantity === 1 ? `حذف ${item.product.name}` : `تقليل كمية ${item.product.name}`} onClick={() => updateQuantity(item.product.id, item.quantity - 1, !!item.is_bulk)}>{item.quantity === 1 ? <Trash2 size={16} /> : <Minus size={17} />}</button>
                </div>}
                <strong className="cart-line-total">{money(lineTotal)} <small>ج.م</small></strong>
              </div>
            </div>
          </article>;
        })}
      </section><aside className="cart-summary">
        <h2>ملخص سلتك</h2>
        <div className="cart-summary-row"><span>قيمة المنتجات</span><strong>{quotePending ? '...' : `${money(subtotal)} ج.م`}</strong></div>
        <div className="cart-summary-row"><span>التوصيل</span>{quotePending ? <small>جاري الحساب</small> : shipping <= 0 ? <strong className="text-primary">مجاني</strong> : <strong>{money(shipping)} ج.م</strong>}</div>
        {quote?.delivery_campaign && Number(quote.delivery_campaign.discount || 0) > 0 && <div className="cart-summary-row"><span>{quote.delivery_campaign.name}</span><small className="text-primary">خصم {money(Number(quote.delivery_campaign.discount || 0))} ج.م</small></div>}
        {quote?.free_delivery && <div className="cart-summary-row"><span>عرض التوصيل</span><small className="text-primary">توصيل مجاني مطبق</small></div>}
        <div className="cart-summary-total"><span>الإجمالي</span><strong>{quotePending ? '...' : money(total)} <small>ج.م</small></strong></div>
        {quote && quote.min_order_amount > 0 && <p className="cart-help">الحد الأدنى للطلب من الفرع: {money(quote.min_order_amount)} ج.م</p>}
        {cta}
        {!user && <p className="cart-help">سجّل برقم موبايلك وكلمة المرور عشان تكمّل الطلب.</p>}
      </aside></div>

      <div className="cart-mobile-action"><div><span>الإجمالي شامل التوصيل</span><strong>{quotePending ? '...' : `${money(total)} ج.م`}</strong></div>{cta}</div>
    </>}

    {weightItem && <WeightSelector product={weightItem.product} isOpen onClose={() => setWeightItem(null)} />}
  </CheckoutLayout>;
}
