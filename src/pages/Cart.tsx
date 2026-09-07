import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Package, Plus, Minus, Trash2, ShoppingBag, Scale, AlertCircle } from 'lucide-react';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import BrandLoader from '@/components/ui/BrandLoader';
import WeightSelector from '@/components/ui/WeightSelector';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';
import { CartItem } from '@/contexts/cartTypes';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
const itemPrice = (item: CartItem) => item.is_bulk ? item.product.bulk_price || 0 : item.product.offer_price || item.product.price || 0;
const itemTotal = (item: CartItem) => itemPrice(item) * item.quantity / (item.unit_of_measure === 'weight' && !item.is_bulk ? 1000 : 1);

export default function Cart() {
  const { items, updateQuantity, removeFromCart, getTotalPrice, isInitialized, syncError, isSaving, retrySync } = useCart();
  const { user, authLoading } = useUser();
  const navigate = useNavigate();
  const [weightItem, setWeightItem] = useState<CartItem | null>(null);

  // Stock is branch-specific. The authoritative checkout quote validates the selected
  // delivery branch and its inventory; products.quantity must never gate the cart.
  const blocked = !isInitialized || authLoading || !!syncError || isSaving;

  const proceed = () => {
    if (blocked) return;
    navigate(user ? '/payment' : '/phone-verify?returnTo=%2Fpayment');
  };

  const cta = <Button className="cart-primary" onClick={proceed} disabled={blocked}>
    {isSaving ? <><BrandLoader size="sm" />جارٍ حفظ سلتك</> : <>متابعة الطلب<ArrowLeft size={18} /></>}
  </Button>;

  return <CheckoutLayout>
    {syncError && <div role="alert" className="cart-alert"><AlertCircle size={20} /><span>{syncError}</span><Button variant="outline" onClick={retrySync}>إعادة المحاولة</Button></div>}

    {!isInitialized ? <div className="cart-loading"><BrandLoader size="lg" /><span>{syncError ? 'سلتك المحفوظة لم تُحمّل بعد' : 'بنجهّز سلتك'}</span></div> : !items.length ?
      <section className="cart-empty"><div className="cart-empty-mark"><ShoppingBag size={38} /></div><h1>سلتك مستنية اختياراتك</h1><p>ضيف احتياجاتك، وهتلاقيها كلها هنا.<br />تقدر تتسوّق وتختار براحتك قبل تسجيل الدخول.</p><Button asChild className="cart-primary"><Link to="/">ابدأ التسوّق<ArrowLeft size={18} /></Link></Button></section> : <>
      <div className="cart-heading">
        <div><h1>سلتك، على ذوقك.</h1><p>{money(items.length)} أصناف · راجع اختياراتك وكمّل طلبك</p></div>
        <div className="cart-status" role="status">{isSaving ? <><BrandLoader size="sm" />جارٍ الحفظ</> : syncError ? 'التعديل لم يُحفظ بعد' : user ? <><Check size={16} />سلتك محفوظة</> : 'تسوّق الآن، وسجّل عند المتابعة'}</div>
      </div>

      <div className="cart-alert" role="status">
        <Check size={18} />
        <span>هنراجع السعر والتوفر النهائي من مخزون فرع التوصيل بعد اختيار عنوانك.</span>
      </div>

      <div className="cart-grid"><section className="cart-list" aria-label="منتجات السلة">
        {items.map(item => <article key={`${item.product.id}:${!!item.is_bulk}:${item.unit_of_measure || ''}`} className="cart-line">
          <Link className="cart-image" to={`/product/${item.product.id}`} tabIndex={-1} aria-hidden="true"><img src={item.product.image_urls?.[0] || '/placeholder.svg'} alt="" loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }} /></Link>
          <div>
            <div className="cart-line-heading">
              <div><Link to={`/product/${item.product.id}`} className="cart-product-name">{item.product.name}</Link><div className="cart-kind">{item.is_bulk ? <><Package size={14} />عبوة جملة · {money(item.product.bulk_quantity || 1)} قطعة</> : item.unit_of_measure === 'weight' ? <><Scale size={14} />بالوزن</> : 'بالقطعة'}</div></div>
              <button className="cart-remove" onClick={() => removeFromCart(item.product.id, !!item.is_bulk)} aria-label={`حذف ${item.product.name}`}><Trash2 size={18} /></button>
            </div>
            <p className="cart-unit-price">{money(itemPrice(item))} ج.م {item.is_bulk ? '/ عبوة' : item.unit_of_measure === 'weight' ? '/ كجم' : '/ قطعة'}{!item.is_bulk && item.product.offer_price > 0 && item.product.offer_price < item.product.price && <del>{money(item.product.price)} ج.م</del>}</p>
            <div className="cart-line-bottom">
              {item.unit_of_measure === 'weight' ? <button className="cart-weight" onClick={() => setWeightItem(item)} aria-label={`تعديل وزن ${item.product.name}`}><Scale size={16} />{money(item.quantity)} جم<span>تعديل</span></button> : <div className="cart-counter">
                <button aria-label={`زيادة كمية ${item.product.name}`} onClick={() => updateQuantity(item.product.id, item.quantity + 1, !!item.is_bulk)}><Plus size={17} /></button>
                <output aria-label={`كمية ${item.product.name}`} aria-live="polite">{money(item.quantity)}</output>
                <button aria-label={item.quantity === 1 ? `حذف ${item.product.name}` : `تقليل كمية ${item.product.name}`} onClick={() => updateQuantity(item.product.id, item.quantity - 1, !!item.is_bulk)}>{item.quantity === 1 ? <Trash2 size={16} /> : <Minus size={17} />}</button>
              </div>}
              <strong className="cart-line-total">{money(itemTotal(item))} <small>ج.م</small></strong>
            </div>
          </div>
        </article>)}
      </section><aside className="cart-summary">
        <h2>ملخص سلتك</h2>
        <div className="cart-summary-row"><span>قيمة المنتجات</span><strong>{money(getTotalPrice())} ج.م</strong></div>
        <div className="cart-summary-row"><span>التوصيل</span><small>بيتحدد حسب عنوانك</small></div>
        <div className="cart-summary-total"><span>المجموع المبدئي</span><strong>{money(getTotalPrice())} <small>ج.م</small></strong></div>
        {cta}
        <p className="cart-help">السعر والتوفر النهائيين بيتأكدوا من السيرفر قبل إنشاء الطلب.</p>
        {!user && <p className="cart-help">هنطلب رقم موبايلك عشان تكمّل طلبك.</p>}
      </aside></div>

      <div className="cart-mobile-action"><div><span>المجموع المبدئي</span><strong>{money(getTotalPrice())} ج.م</strong></div>{cta}</div>
    </>}

    {weightItem && <WeightSelector product={weightItem.product} isOpen onClose={() => setWeightItem(null)} />}
  </CheckoutLayout>;
}
