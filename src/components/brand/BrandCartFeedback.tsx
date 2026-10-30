import { useEffect, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import BrandMark from './BrandMark';
import { BRAND_PRODUCT_ADDED_MOTION, type ProductAddedMotion } from '@/lib/brandMicroMotion';

export const BRAND_CART_ADDED_EVENT = 'super-marko:cart-added';

type Flight = ProductAddedMotion & { id: number };

/** Existing add-to-cart receipt stays authoritative; optional flying image is visual only. */
export default function BrandCartFeedback() {
  const [sequence, setSequence] = useState(0);
  const [flight, setFlight] = useState<Flight | null>(null);

  useEffect(() => {
    let receiptTimer: ReturnType<typeof setTimeout> | null = null;
    let flightTimer: ReturnType<typeof setTimeout> | null = null;
    let flightId = 0;

    const notify = () => {
      if (receiptTimer) clearTimeout(receiptTimer);
      setSequence(id => id + 1);
      receiptTimer = setTimeout(() => setSequence(0), 650);
    };
    const animateProduct = (event: Event) => {
      const detail = (event as CustomEvent<ProductAddedMotion>).detail;
      if (!detail || !Number.isFinite(detail.x) || !Number.isFinite(detail.targetX) ||
          !Number.isFinite(detail.y) || !Number.isFinite(detail.targetY) ||
          typeof detail.imageUrl !== 'string') return;
      if (flightTimer) clearTimeout(flightTimer);
      setFlight({ ...detail, id: ++flightId });
      flightTimer = setTimeout(() => setFlight(null), 560);
    };
    window.addEventListener(BRAND_CART_ADDED_EVENT, notify);
    window.addEventListener(BRAND_PRODUCT_ADDED_MOTION, animateProduct);
    return () => {
      window.removeEventListener(BRAND_CART_ADDED_EVENT, notify);
      window.removeEventListener(BRAND_PRODUCT_ADDED_MOTION, animateProduct);
      if (receiptTimer) clearTimeout(receiptTimer);
      if (flightTimer) clearTimeout(flightTimer);
    };
  }, []);

  return (
    <>
      {sequence > 0 && (
        <div key={sequence} className="brand-cart-feedback" role="status" aria-live="polite">
          <BrandMark variant="badge" motion="pop" className="brand-cart-feedback__mark" />
          <span>اتضاف للسلة</span>
          <Check size={15} aria-hidden="true" />
        </div>
      )}
      {flight && (
        <span
          key={flight.id}
          aria-hidden="true"
          className="brand-product-flight"
          style={{
            left: flight.x,
            top: flight.y,
            '--brand-flight-x': `${flight.targetX - flight.x}px`,
            '--brand-flight-y': `${flight.targetY - flight.y}px`,
            '--brand-flight-mid-x': `${(flight.targetX - flight.x) * .36}px`,
            '--brand-flight-mid-y': `${(flight.targetY - flight.y) * .22 - 22}px`,
          } as CSSProperties}
        >
          <img src={flight.imageUrl} alt="" draggable={false} />
        </span>
      )}
    </>
  );
}
