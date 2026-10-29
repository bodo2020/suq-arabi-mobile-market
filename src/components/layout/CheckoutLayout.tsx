import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import HeaderBrand from '@/components/layout/header/HeaderBrand';
import { useCart } from '@/contexts/useCart';
import './checkout.css';
import './checkout-native.css';

/** A focused transactional header: only back, page context, and the brand.
 * The same system supports cart, addresses, single and combined payments.
 */
export default function CheckoutLayout({
  children, step = 1, backTo, backLabel, showSteps = true,
}: {
  children: ReactNode;
  step?: 1 | 2;
  backTo?: string;
  backLabel?: string;
  showSteps?: boolean;
}) {
  const { items } = useCart();
  const isCart = step === 1;
  return (
    <div className="checkout" dir="rtl">
      <header className="checkout-header">
        <Link to={backTo || (isCart ? '/' : '/cart')} className="checkout-back">
          <ArrowRight size={21} aria-hidden="true" />
          <span className="hidden sm:inline">{backLabel || (isCart ? 'كمّل تسوّقك' : 'رجوع للسلة')}</span>
        </Link>
        <div className="checkout-header__context">
          <strong>{isCart ? 'سلة التسوق' : showSteps ? 'التوصيل والدفع' : 'العناوين'}</strong>
          {isCart && items.length > 0 && <span>{items.length.toLocaleString('ar-EG')} أصناف</span>}
        </div>
        <HeaderBrand compact iconOnly className="sm:hidden" />
        <HeaderBrand compact className="hidden sm:inline-flex" />
      </header>
      <main className="checkout-main">
        {showSteps && (
          <ol className="checkout-steps" aria-label="خطوات الطلب">
            <li aria-current={isCart ? 'step' : undefined}>
              <span>{isCart ? '١' : <Check size={16} />}</span>سلتك
            </li>
            <li className={isCart ? 'upcoming' : 'current'} aria-current={!isCart ? 'step' : undefined}>
              <span>٢</span>التوصيل والدفع
            </li>
          </ol>
        )}
        {children}
      </main>
    </div>
  );
}
