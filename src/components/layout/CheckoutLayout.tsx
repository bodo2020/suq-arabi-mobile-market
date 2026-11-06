import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useCart } from '@/contexts/useCart';
import './checkout.css';
import './checkout-native.css';
import './header/app-header.css';

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
      <header className="checkout-header app-header">
        <div className="app-header__row">
          <Link to={backTo || (isCart ? '/' : '/cart')} className="hdr-btn" aria-label={backLabel || (isCart ? 'كمّل تسوّقك' : 'رجوع للشنطة')}>
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
          <div className="app-header__title">
            {isCart ? 'شنطة التسوق' : showSteps ? 'التوصيل والدفع' : 'العناوين'}
            {isCart && items.length > 0 && <small>{items.length.toLocaleString('ar-EG')} أصناف</small>}
          </div>
          <span className="hdr-spacer" aria-hidden="true" />
        </div>
      </header>
      <main className="checkout-main">
        {showSteps && (
          <ol className="checkout-steps" aria-label="خطوات الطلب">
            <li aria-current={isCart ? 'step' : undefined}>
              <span>{isCart ? '١' : <Check size={16} />}</span>شنطتك
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
