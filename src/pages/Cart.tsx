import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Package, Plus, Minus, Trash2, ShoppingBag, Scale, AlertCircle, RefreshCw, Route, Store } from 'lucide-react';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import BrandLoader from '@/components/ui/BrandLoader';
import WeightSelector from '@/components/ui/WeightSelector';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';
import { useBranch } from '@/contexts/BranchContext';
import { CartItem, cartItemIdentity, isMarketplaceCart } from '@/contexts/cartTypes';
import { cartQuoteError, quoteCart, type CartQuoteLine } from '@/lib/cartQuote';
import { formatWeightAmount, productWeightStepGrams } from '@/lib/productPurchase';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
const localItemPrice = (item: CartItem) => item.is_bulk ? item.product.bulk_price || 0 : item.product.offer_price || item.product.price || 0;
const localItemTotal = (item: CartItem) => localItemPrice(item) * item.quantity / (item.unit_of_measure === 'weight' && !item.is_bulk ? 1000 : 1);
const quoteLineKey = (line: CartQuoteLine) => line.listing_id ? `marketplace:${line.listing_id}:${line.unit_of_measure}` : `owned:${line.product_id}:${!!line.is_bulk}:${line.unit_of_measure}`;
const itemQuoteKey = (item: CartItem) => item.commerce_source === 'marketplace' ? `marketplace:${item.marketplace_listing_id}:${item.unit_of_measure === 'weight' ? 'weight' : 'piece'}` : `owned:${item.product.id}:${!!item.is_bulk}:${item.unit_of_measure === 'weight' ? 'weight' : 'piece'}`;

export default function Cart() {
  const { items, updateQuantity, removeFromCart, getTotalPrice, isInitialized, syncError, isSaving, retrySync } = useCart();
  const { user, authLoading } = useUser();
  const { branch, branchLoading, branchError, refreshBranch } = useBranch();
  const navigate = useNavigate();
  const [weightItem, setWeightItem] = useState<CartItem | null>(null);
  const marketplace = isMarketplaceCart(items);

  const quoteSignature = useMemo(() => items.map(item => `${cartItemIdentity(item)}:${item.quantity}`).sort().join('|'), [items]);
  const quoteQuery = useQuery({
    queryKey: ['cart-server-quote', marketplace ? items[0]?.marketplace_branch_id : branch?.delivery_branch_id, user?.id || 'guest', quoteSignature],
    queryFn: () => quoteCart(items),
    enabled: isInitialized && items.length > 0 && !branchLoading && (marketplace || Boolean(branch)),
    retry: 1,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const quote = quoteQuery.data;
  const quoteLines = useMemo(() => new Map((quote?.items || []).map(line => [quoteLineKey(line), line])), [quote?.items]);
  const quoteError = quoteQuery.error ? cartQuoteError(quoteQuery.error) : null;
  const quotePending = quoteQuery.isLoading || quoteQuery.isFetching;
  const serverReady = Boolean(quote) && !quotePending && !quoteError;
  const branchBlocked = !marketplace && (!!branchError || !branch);
  const minimumBlocked = Boolean(quote && !quote.minimum_order_met);
  const blocked = !isInitialized || authLoading || !!syncError || isSaving || branchLoading || branchBlocked || !serverReady || minimumBlocked;

  const proceed = () => {
    if (blocked) return;
    const target = marketplace ? '/marketplace-payment' : '/payment';
    navigate(user ? target : `/phone-verify?returnTo=${encodeURIComponent(target)}`);
  };

  const retryQuote = async () => {
    if (!marketplace) await refreshBranch();
    await quoteQuery.refetch();
  };

  const subtotal = Number(quote?.subtotal ?? getTotalPrice());
  const shipping = Number(quote?.shipping_cost ?? (!marketplace ? branch?.delivery_fee : 0) ?? 0);
  const total = Number(quote?.total ?? subtotal + shipping);
  const cta = <Button className="cart-primary" onClick={proceed} disabled={blocked}>{isSaving ? <><BrandLoader size="sm" />جارٍ حفظ سلتك</> : quotePending ? <><BrandLoader size="sm" />بنراجع السعر والتوصيل</> : <>متابعة الطلب<ArrowLeft size={18} /></>}</Button>;

  return <CheckoutLayout>
    {syncError && <div role="alert" className="cart-alert"><AlertCircle size={20} /><span>{syncError}</span><Button variant="outline" onClick={retrySync}>إعادة المحاولة</Button></div>}
    {((!marketplace && branchError) || quoteError) && <div role="alert" className="cart-alert"><AlertCircle size={20} /><span>{(!marketplace && branchError) || quoteError}</span><Button variant="outline" onClick={() => void retryQuote()}><RefreshCw size={16} />إعادة المراجعة</Button></div>}

    {!isInitialized ? <div className="cart-loading"><BrandLoader size="lg" /><span>بنجهّز سلتك</span></div> : !items.length ?
      <section className="cart-empty"><div className="cart-empty-mark"><ShoppingBag size={38} /></div><h1>سلتك مستنية اختياراتك</h1><p>ضيف احتياجاتك، وهتلاقيها كلها هنا.</p><div className="flex flex-wrap justify-center gap-2"><Button asChild className="cart-primary"><Link to="/">تسوّق من المعداوي<ArrowLeft size={18} /></Link></Button><Button asChild variant="outline"><Link to="/stores"><Store size={17} />المتاجر القريبة</Link></Button></div></section> : <>
      <div className="cart-heading"><div><h1>سلتك، على ذوقك.</h1><p>{money(items.length)} أصناف · {marketplace ? `طلب منفصل من ${items[0]?.merchant_name || 'المتجر'}` : 'راجع اختياراتك وكمّل طلبك'}</p></div><div className="cart-status" role="status">{isSaving ? <><BrandLoader size="sm" />جارٍ الحفظ</> : quotePending ? <><BrandLoader size="sm" />تحديث السعر والمخزون</> : syncError ? 'التعديل لم يُحفظ بعد' : user ? <><Check size={16} />سلتك محفوظة</> : 'سلة الضيف جاهزة'}</div></div>

      {marketplace && <div className="cart-alert" role="status"><Store size={18} /><span>السلة مرتبطة بمتجر <strong>{quote?.merchant_name || items[0]?.merchant_name}</strong> · {quote?.branch_name || items[0]?.marketplace_branch_name}. لا يمكن خلط منتجات متجر آخر في نفس الطلب.</span></div>}
      {!marketplace && branch && <div className="cart-alert" role="status"><Route size={18} /><span>السلة متصلة بفرع <strong>{quote?.branch_name || branch.branch_name}</strong>{quote?.road_distance_km ? ` · مسافة الطريق ${money(Number(quote.road_distance_km))} كم` : ''}{quote?.road_duration_minutes ? ` · حوالي ${money(Number(quote.road_duration_minutes))} دقيقة` : ''}.</span></div>}

      <div className="cart-grid"><section className="cart-list" aria-label="منتجات السلة">
        {items.map(item => {
          const line = quoteLines.get(itemQuoteKey(item));
          const unitPrice = Number(line?.price ?? localItemPrice(item));
          const lineTotal = Number(line?.total ?? localItemTotal(item));
          const availableStock = Number(line?.available_stock ?? item.product.quantity ?? 0);
          const bulkQty = Number(line?.bulk_quantity ?? item.product.bulk_quantity ?? 1);
          const isWeight = item.unit_of_measure === 'weight' && !item.is_bulk;
          const bulkUnitType = item.is_bulk ? (String((item.product as typeof item.product & { bulk_variant_type?: string | null }).bulk_variant_type || '').trim() || 'جملة') : '';
          const bulkVariantId = item.is_bulk ? item.product.bulk_variant_id || null : null;
          const productHref = marketplace ? `/stores/${item.marketplace_branch_id}` : item.is_bulk ? `/product/${item.product.id}?unit=bulk${bulkVariantId ? `&variant=${encodeURIComponent(bulkVariantId)}` : ''}` : `/product/${item.product.id}`;
          const weightStep = isWeight ? productWeightStepGrams(item.product) : 0;
          const maxQuantity = isWeight ? Math.floor(availableStock * 1000) : item.is_bulk ? Math.floor(availableStock / Math.max(1, bulkQty)) : Math.floor(availableStock);
          const atLimit = serverReady && item.quantity >= maxQuantity;
          const weightCanIncrease = isWeight && serverReady && item.quantity < maxQuantity;
          const openWeightEditor = () => setWeightItem({ ...item, product: { ...item.product, quantity: availableStock } });

          return <article key={cartItemIdentity(item)} className="cart-line"><Link className="cart-image" to={productHref} tabIndex={-1} aria-hidden="true"><img src={item.product.image_urls?.[0] || '/placeholder.svg'} alt="" loading="lazy" onError={event => { event.currentTarget.onerror=null; event.currentTarget.src='/placeholder.svg'; }} /></Link><div><div className="cart-line-heading"><div><Link to={productHref} className="cart-product-name">{item.product.name}</Link><div className="cart-kind">{item.is_bulk ? <><Package size={14} />{bulkUnitType} · {money(bulkQty)} قطعة</> : isWeight ? <><Scale size={14} />بالوزن · الخطوة {formatWeightAmount(weightStep)}</> : 'بالقطعة'}</div></div><button className="cart-remove" onClick={() => removeFromCart(item.product.id, !!item.is_bulk)} aria-label={`حذف ${item.product.name}`}><Trash2 size={18} /></button></div><p className="cart-unit-price">{money(unitPrice)} ج.م {item.is_bulk ? `/ ${bulkUnitType}` : isWeight ? '/ كجم' : '/ قطعة'}{line && <span className="mr-2 text-[11px] text-primary">سعر مباشر</span>}</p><div className="cart-line-bottom">
            {isWeight ? <div className="cart-counter"><button disabled={!weightCanIncrease} onClick={() => updateQuantity(item.product.id, Math.min(maxQuantity,item.quantity+weightStep),false)}><Plus size={17} /></button><button type="button" onClick={openWeightEditor} className="min-w-[86px] px-2 text-sm font-bold text-primary">{formatWeightAmount(item.quantity)}</button><button onClick={() => item.quantity<=weightStep ? removeFromCart(item.product.id,false) : updateQuantity(item.product.id,Math.max(1,item.quantity-weightStep),false)}>{item.quantity<=weightStep ? <Trash2 size={16} /> : <Minus size={17} />}</button></div> : <div className="cart-counter"><button disabled={atLimit || !serverReady} onClick={() => updateQuantity(item.product.id,item.quantity+1,!!item.is_bulk)}><Plus size={17} /></button><output>{money(item.quantity)}</output><button onClick={() => updateQuantity(item.product.id,item.quantity-1,!!item.is_bulk)}>{item.quantity===1 ? <Trash2 size={16} /> : <Minus size={17} />}</button></div>}
            <strong className="cart-line-total">{money(lineTotal)} <small>ج.م</small></strong></div></div></article>;
        })}
      </section><aside className="cart-summary"><h2>ملخص سلتك</h2><div className="cart-summary-row"><span>قيمة المنتجات</span><strong>{quotePending ? '...' : `${money(subtotal)} ج.م`}</strong></div><div className="cart-summary-row"><span>التوصيل</span>{quotePending ? <small>جاري الحساب</small> : shipping<=0 ? <strong className="text-primary">مجاني</strong> : <strong>{money(shipping)} ج.م</strong>}</div><div className="cart-summary-total"><span>الإجمالي</span><strong>{quotePending ? '...' : money(total)} <small>ج.م</small></strong></div>{quote && quote.min_order_amount>0 && <p className={`cart-help ${!quote.minimum_order_met ? 'text-amber-700 font-bold' : ''}`}>الحد الأدنى للطلب: {money(quote.min_order_amount)} ج.م{!quote.minimum_order_met ? ' — زوّد منتجات قبل المتابعة' : ''}</p>}{marketplace && quote?.estimated_time && <p className="cart-help">وقت التوصيل المتوقع: {quote.estimated_time}</p>}{cta}<p className="cart-help">السعر والمخزون والتوصيل بيتراجعوا من السيرفر قبل إنشاء الطلب.</p></aside></div>
      <div className="cart-mobile-action"><div><span>الإجمالي شامل التوصيل</span><strong>{quotePending ? '...' : `${money(total)} ج.م`}</strong></div>{cta}</div>
    </>}
    {weightItem && <WeightSelector product={weightItem.product} isOpen onClose={() => setWeightItem(null)} />}
  </CheckoutLayout>;
}
