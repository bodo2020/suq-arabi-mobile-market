import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import BrandWordmark from '@/components/brand/BrandWordmark';
import BrandMark from '@/components/brand/BrandMark';
import './checkout.css';
import './checkout-native.css';

export default function CheckoutLayout({ children, step = 1, backTo, backLabel, showSteps = true }: { children: ReactNode; step?: 1 | 2; backTo?: string; backLabel?: string; showSteps?: boolean }) {
  return <div className="checkout" dir="rtl">
    <header className="checkout-header">
      <Link to={backTo || (step === 1 ? '/' : '/cart')} className="checkout-back"><ArrowRight size={20} /><span>{backLabel || (step === 1 ? 'كمّل تسوّقك' : 'رجوع للسلة')}</span></Link>
      <Link to="/" aria-label="سوبر ماركو — الرئيسية" className="inline-flex items-center gap-1.5"><BrandMark variant="mark" className="h-9 w-[27px]" /><BrandWordmark /></Link>
    </header>
    <main className="checkout-main">
      {showSteps && <ol className="checkout-steps" aria-label="خطوات الطلب">
        <li aria-current={step === 1 ? 'step' : undefined}><span>{step === 2 ? <Check size={16} /> : '١'}</span>سلتك</li>
        <li className={step === 2 ? 'current' : 'upcoming'} aria-current={step === 2 ? 'step' : undefined}><span>٢</span>التوصيل والدفع</li>
      </ol>}
      {children}
    </main>
  </div>;
}
