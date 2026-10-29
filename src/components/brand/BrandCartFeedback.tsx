import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import BrandMark from './BrandMark';

export const BRAND_CART_ADDED_EVENT = 'super-marko:cart-added';

/** Lightweight visual receipt, not an additional cart round trip. */
export default function BrandCartFeedback() {
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const notify = () => {
      if (timer) clearTimeout(timer);
      setSequence(id => id + 1);
      timer = setTimeout(() => setSequence(0), 550);
    };
    window.addEventListener(BRAND_CART_ADDED_EVENT, notify);
    return () => {
      window.removeEventListener(BRAND_CART_ADDED_EVENT, notify);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!sequence) return null;
  return (
    <div key={sequence} className="brand-cart-feedback" role="status" aria-live="polite">
      <BrandMark variant="badge" motion="pop" className="brand-cart-feedback__mark" />
      <span>اتضاف للسلة</span>
      <Check size={15} aria-hidden="true" />
    </div>
  );
}
