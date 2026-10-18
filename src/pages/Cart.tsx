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
import DeliveryRouteSummary from '@/components/checkout/DeliveryRouteSummary';
import { groupStoreCarts, itemQuoteIdentity, quoteIdentity, cartLinePrice, cartLineTotal } from '@/lib/storeCarts';
import { useToast } from '@/hooks/use-toast';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
const localItemPrice = cartLinePrice;
const localItemTotal = cartLineTotal;

export default function Cart() {
  const { items, checkoutItems, selectedStoreKeys, toggleCheckoutStore, updateQuantity, removeFromCart, isInitialized, syncError, isSaving, retrySync } = useCart();
  const { toast } = useToast();
  const groups = useMemo(() => groupStoreCarts(items), [items]);
  const { user, authLoading } = useUser();
  const { branch, branchLoading, branchError, refreshBranch } = useBranch();
  const navigate = useNavigate();
  const [weightItem, setWeightItem] = useState<CartItem | null>(null);
  const hasModifierDraft = checkoutItems.some(item => Boolean(item.restaurant_modifier_selection_key || item.restaurant_modifier_picks));

  const quoteSignature = useMemo(
    () => checkoutItems.map(item => `${cartItemIdentity(item)}:${item.quantity}`).sort().join('|'),
    [checkoutItems],
  );

  const quoteQuery = useQuery({
    queryKey: ['cart-server-quote', branch?.delivery_branch_id, user?.id || 'guest', quoteSignature],
    queryFn: () => quoteCart(checkoutItems),
    enabled: isInitialized && checkoutItems.length > 0 && Boolean(branch) && !branchLoading && !hasModifierDraft,
    retry: 1,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const quote = quoteQuery.data;
  const quoteLines = useMemo(
    () => new Map((quote?.items || []).map(line => [quoteIdentity(line), line])),
    [quote?.items],
  );

  const quoteError = quoteQuery.error ? cartQuoteError(quoteQuery.error) : null;
  const quotePending = quoteQuery.isLoading || quoteQuery.isFetching;
  const serverReady = Boolean(quote) && !quotePending && !quoteError;
  const blocked = hasModifierDraft || !checkoutItems.length || !isInitialized || authLoading || !!syncError || isSaving || branchLoading || !!branchError || !branch || !serverReady;

  const combinedCart = isCombinedCart(checkoutItems);
  const marketplaceCart = isSingleMarketplaceCart(checkoutItems);

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
    {hasModifierDraft ? 'طلب الإضافات غير متاح بعد' : isSaving ? <><BrandLoader size="sm" />جارٍ حفظ سلتك</> : quotePending ? <><BrandLoader size="sm" />بنحسب الطريق والأسعار</> : <>متابعة الطلب<ArrowLeft size={18} /></>}
  </Button>;

  const subtotal = Number(quote?.subtotal ?? checkoutItems.reduce((sum, item) => sum + localItemTotal(item), 0));
  const shipping = Number(quote?.shipping_cost ?? 0);
  const total = Number(quote?.total ?? subtotal + shipping);
  const deliveryEtaStart = Math.max(
    10,
    Math.round(Number(quote?.estimated_delivery_minutes || branch?.estimated_delivery_minutes || 45) / 5) * 5,
  );
  const deliveryEtaEnd = deliveryEtaStart + 5;

  return <CheckoutLayout>
    {syncError && <div role="alert" className="cart-alert"><AlertCircle size={20} /><span>{syncError}</span><Button variant="outline" onClick={retrySync}>إعادة المحاولة</Button></div>}
    {(branchError || quoteError) && <div role="alert" className="cart-alert"><AlertCircle size={20} /><span>{branchError || quoteError}</span><Button variant="outline" onClick={() => void retryQuote()}><RefreshCw size={16} />إعادة المراجعة</Button></div>}
    {hasModifierDraft && <div role="note" className="cart-alert"><AlertCircle size={20} /><span>تكوينات وجبات المطعم محفوظة للمعاينة فقط. الأسعار المعروضة هنا تقديرية، وطلب الوجبات بالإضافات هيتاح بعد تفعيل الدفع والتحقق النهائي من السعر.</span></div>}

    {!isInitialized ? <div className="cart-loading"><BrandLoader size="lg" /><span>{syncError ? 'سلتك المحفوظة لم تُحمّل بعد' : 'بنجهّز سلتك'}</span></div> : !items.length ?
      <section className="cart-empty"><div className="cart-empty-mark"><ShoppingBag size={38} /></div><h1>سلتك مستنية اختياراتك</h1><p>ضيف احتياجاتك، وهتلاقيها كلها هنا.<br />تقدر تتسوّق وتختار براحتك قبل تسجيل الدخول.</p><Button asChild className="cart-primary"><Link to="/">ابدأ التسوّق<ArrowLeft size={18} /></Link></Button></section> : <>
      <div className="cart-heading">
        <div><h1>سلات محلاتك</h1><p>{money(groups.length)} محلات · اختار السلات اللي هتطلبها مع بعض</p></div>
        <div className="cart-status" role="status">{isSaving ? <><BrandLoader size="sm" />جارٍ الحفظ</> : quotePending ? <><BrandLoader size="sm" />تحديث الطريق والسعر والمخزون</> : syncError ? 'التعديل لم يُحفظ بعد' : user ? <><Check size={16} />سلتك محفوظة</> : 'سلة الضيف جاهزة'}</div>
      </div>

      {serverReady && branch && <div className="cart-alert" role="status">
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

      <p className="mb-4 text-sm leading-6 text-slate-600">كل محل له سلته. تقدر تجمع محلين شركاء ومعاهم ســــــوبـرمــــاركو في توصيل واحد؛ السلات غير المختارة تفضل محفوظة.</p>
      <div className="cart-grid"><div className="space-y-4">
        {groups.map(group => {
          const selected = selectedStoreKeys.includes(group.key);
          const groupTotal = group.items.reduce((sum, item) => sum + Number((selected ? quoteLines.get(itemQuoteIdentity(item))?.total : undefined) ?? localItemTotal(item)), 0);
          return <section key={group.key} className={'cart-list ' + (selected ? 'ring-1 ring-[#9acbb2]' : '')} aria-label={'سلة ' + group.name}>
            <header className="store-cart-heading">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#005931]" checked={selected} onChange={() => {
                  if (!toggleCheckoutStore(group.key)) toast({ title: 'اختار محلين شركاء للطلب الواحد', description: 'شيل اختيار محل لإضافة محل تاني. كل السلات هتفضل محفوظة.' });
                }} />
                <span className="min-w-0"><strong className="block break-words">{group.name}</strong><small>{money(group.items.length)} أصناف · {selected ? 'ضمن الطلب' : 'محفوظة لوقت تاني'}</small></span>
              </label>
              <strong className="shrink-0 text-primary">{money(groupTotal)} ج.م</strong>
            </header>
            <Link className="flex min-h-10 items-center px-4 text-xs font-bold text-primary" to={group.branchId ? '/stores/' + group.branchId : '/'}>كمّل اختياراتك من المحل ←</Link>
        {group.items.map(item => {
          const line = selected ? quoteLines.get(itemQuoteIdentity(item)) : undefined;
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
            : `/product/${item.product.id}${item.commerce_source === 'marketplace' && item.marketplace_branch_id ? `?store=${encodeURIComponent(item.marketplace_branch_id)}` : ''}`;
          const weightStep = isWeight ? productWeightStepGrams(item.product) : 0;
          const maxQuantity = isWeight
            ? Math.floor(availableStock * 1000)
            : item.is_bulk
              ? Math.floor(availableStock / Math.max(1, bulkQty))
              : Math.floor(availableStock);
          const usedAcrossMealChoices = items.some(other => other.marketplace_listing_id === item.marketplace_listing_id
              && other.marketplace_branch_id === item.marketplace_branch_id
              && other.product.id === item.product.id && other.restaurant_modifier_selection_key)
            ? items.filter(other => other.marketplace_listing_id === item.marketplace_listing_id
              && other.marketplace_branch_id === item.marketplace_branch_id
              && other.product.id === item.product.id && !other.is_bulk).reduce((sum, other) => sum + other.quantity, 0)
            : item.quantity;
          const lineReady = selected && serverReady && Boolean(line);
          const atLimit = usedAcrossMealChoices >= maxQuantity;
          const weightCanIncrease = isWeight && (lineReady || !selected) && item.quantity < maxQuantity;
          const openWeightEditor = () => setWeightItem({
            ...item,
            product: { ...item.product, quantity: availableStock },
          });

          return <article key={cartItemIdentity(item)} className="cart-line">
            <Link className="cart-image" to={productHref} tabIndex={-1} aria-hidden="true"><img src={item.product.image_urls?.[0] || '/placeholder.svg'} alt="" loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }} /></Link>
            <div>
              <div className="cart-line-heading">
                <div><Link to={productHref} className="cart-product-name">{item.product.name}</Link><div className="mt-1 text-[11px] font-bold text-primary">{item.commerce_source === 'marketplace' ? (item.merchant_name || item.marketplace_branch_name || 'متجر شريك') : 'ســــــوبـرمــــاركو'}</div><div className="cart-kind">{item.is_bulk ? <><Package size={14} />{bulkUnitType} · {money(bulkQty)} قطعة</> : isWeight ? <><Scale size={14} />بالوزن · الخطوة {formatWeightAmount(weightStep)}</> : 'بالقطعة'}</div></div>
                <button className="cart-remove" onClick={() => removeFromCart(item.product.id, !!item.is_bulk, item.marketplace_listing_id || null, item.restaurant_modifier_selection_key || null)} aria-label={`حذف ${item.product.name}`}><Trash2 size={18} /></button>
              </div>
              {item.restaurant_modifier_selection_key && <div className="mt-2 rounded-xl bg-amber-50 p-2 text-xs leading-5 text-amber-950">
                <strong>تكوين الوجبة · معاينة فقط</strong>
                <span className="mt-1 block">{item.restaurant_modifier_snapshot?.map(option => `${option.option_name}${option.quantity > 1 ? ` × ${option.quantity}` : ''}`).join('، ') || 'بدون إضافات'}</span>
                <span className="block">الإضافات: {money(Number(item.restaurant_modifier_unit_delta || 0))} ج.م للوجبة</span>
              </div>}
              <p className="cart-unit-price">{money(unitPrice)} ج.م {item.is_bulk ? `/ ${bulkUnitType}` : isWeight ? '/ كجم' : '/ قطعة'}{line && <span className="mr-2 text-[11px] text-primary">سعر الفرع</span>}</p>
              <div className="cart-line-bottom">
                {isWeight ? (
                  <div className="cart-counter">
                    <button
                      disabled={!weightCanIncrease}
                      aria-label={atLimit ? `وصلت للوزن المتاح من ${item.product.name}` : `زيادة الوزن بمقدار ${formatWeightAmount(weightStep)}`}
                      onClick={() => updateQuantity(item.product.id, Math.min(maxQuantity, item.quantity + weightStep), false, item.marketplace_listing_id || null)}
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
                        ? removeFromCart(item.product.id, false, item.marketplace_listing_id || null)
                        : updateQuantity(item.product.id, Math.max(1, item.quantity - weightStep), false, item.marketplace_listing_id || null)}
                    >{item.quantity <= weightStep ? <Trash2 size={16} /> : <Minus size={17} />}</button>
                  </div>
                ) : <div className="cart-counter">
                  <button disabled={atLimit || (selected && !lineReady && !item.restaurant_modifier_selection_key)} aria-label={atLimit ? `وصلت للكمية المتاحة من ${item.product.name}` : `زيادة كمية ${item.product.name}`} onClick={() => updateQuantity(item.product.id, item.quantity + 1, !!item.is_bulk, item.marketplace_listing_id || null, item.restaurant_modifier_selection_key || null)}><Plus size={17} /></button>
                  <output aria-label={`كمية ${item.product.name}`} aria-live="polite">{money(item.quantity)}</output>
                  <button aria-label={item.quantity === 1 ? `حذف ${item.product.name}` : `تقليل كمية ${item.product.name}`} onClick={() => updateQuantity(item.product.id, item.quantity - 1, !!item.is_bulk, item.marketplace_listing_id || null, item.restaurant_modifier_selection_key || null)}>{item.quantity === 1 ? <Trash2 size={16} /> : <Minus size={17} />}</button>
                </div>}
                <strong className="cart-line-total">{money(lineTotal)} <small>ج.م</small></strong>
              </div>
            </div>
          </article>;
        })}
      </section>; })}
      </div><aside className="cart-summary">
        <h2>ملخص السلات المختارة</h2>
        {!checkoutItems.length && <p className="mb-4 text-sm text-slate-500">اختار سلة واحدة على الأقل عشان نراجع السعر والتوصيل.</p>}
        <div className="cart-summary-row"><span>قيمة المنتجات</span><strong>{quotePending ? '...' : `${money(subtotal)} ج.م`}</strong></div>
        <div className="cart-summary-row"><span>التوصيل</span>{!serverReady ? <small>بعد مراجعة المسار</small> : shipping <= 0 ? <strong className="text-primary">مجاني</strong> : <strong>{money(shipping)} ج.م</strong>}</div>
        {quote?.delivery_campaign && Number(quote.delivery_campaign.discount || 0) > 0 && <div className="cart-summary-row"><span>{quote.delivery_campaign.name}</span><small className="text-primary">خصم {money(Number(quote.delivery_campaign.discount || 0))} ج.م</small></div>}
        {quote?.free_delivery && <div className="cart-summary-row"><span>عرض التوصيل</span><small className="text-primary">توصيل مجاني مطبق</small></div>}
        <div className="cart-summary-total"><span>الإجمالي</span><strong>{!serverReady ? '—' : money(total)} <small>ج.م</small></strong></div>
        {quote?.delivery && serverReady && <DeliveryRouteSummary delivery={quote.delivery} />}
        {quote && quote.min_order_amount > 0 && <p className="cart-help">الحد الأدنى للطلب من الفرع: {money(quote.min_order_amount)} ج.م</p>}
        {cta}
        {!user && <p className="cart-help">سجّل برقم موبايلك وكلمة المرور عشان تكمّل الطلب.</p>}
      </aside></div>

      <div className="cart-mobile-action"><div><span>إجمالي السلات المختارة</span><strong>{!serverReady ? '—' : `${money(total)} ج.م`}</strong></div>{cta}</div>
    </>}

    {weightItem && <WeightSelector product={weightItem.product} isOpen onClose={() => setWeightItem(null)} />}
  </CheckoutLayout>;
}
