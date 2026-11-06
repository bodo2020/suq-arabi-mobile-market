import { Link } from 'react-router-dom';
import { ArrowLeft, BadgePercent, Grid2X2 } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import './cart-empty-motion.css';

/**
 * Empty bag gag: the official bag mark (never altered) flips upside down and
 * gets shaken, a few puffs of air and one bored moth fall out, then it flips
 * back with a sigh. Turning the bag over naturally turns its smile into a
 * frown. Transform/opacity only; static under prefers-reduced-motion.
 */
export default function CartEmptyState() {
  return (
    <section className="cart-empty-state" aria-labelledby="cart-empty-heading">
      <div className="cart-empty-scene" aria-hidden="true">
        <span className="cart-empty-scene__halo" />
        <span className="cart-empty-scene__shadow" />
        <span className="cart-empty-bag">
          <BrandMark variant="mark" motion="reveal" className="cart-empty-bag__mark" />
          <span className="cart-empty-tear" />
        </span>
        <span className="cart-empty-puffs">
          <i style={{ '--dx': '-26px', '--dy': '6px' } as React.CSSProperties} />
          <i style={{ '--dx': '2px', '--dy': '16px' } as React.CSSProperties} />
          <i style={{ '--dx': '28px', '--dy': '4px' } as React.CSSProperties} />
        </span>
        <svg className="cart-empty-moth" viewBox="0 0 40 32" fill="none" focusable="false" aria-hidden="true">
          <g className="cart-empty-moth__wing cart-empty-moth__wing--left">
            <ellipse cx="12" cy="14" rx="10" ry="7.5" transform="rotate(-24 12 14)" fill="#dfe8e2" stroke="#8ea597" strokeWidth="1.6" />
            <circle cx="10" cy="13" r="2" fill="#c3d2c8" />
          </g>
          <g className="cart-empty-moth__wing cart-empty-moth__wing--right">
            <ellipse cx="28" cy="14" rx="10" ry="7.5" transform="rotate(24 28 14)" fill="#dfe8e2" stroke="#8ea597" strokeWidth="1.6" />
            <circle cx="30" cy="13" r="2" fill="#c3d2c8" />
          </g>
          <ellipse cx="20" cy="17" rx="3.2" ry="8" fill="#6d8476" />
          <path d="M18.6 9.6C17.4 6.6 15.6 5 13.8 4.4M21.4 9.6C22.6 6.6 24.4 5 26.2 4.4" stroke="#6d8476" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>

      <h1 id="cart-empty-heading">شنطتك فاضية… وزعلانة!</h1>
      <p className="cart-empty-state__description">
        هزّيناها كويس… ملقيناش غير شوية هوا وفراشة زهقانة.
        <span className="cart-empty-state__description-line">ضيف أول حاجة وهترجع تضحك تاني.</span>
      </p>

      <Link to="/" className="cart-empty-state__primary">
        يلا نتسوّق
        <ArrowLeft size={19} aria-hidden="true" />
      </Link>

      <nav className="cart-empty-state__links" aria-label="طرق تبدأ بيها التسوق">
        <Link to="/categories">
          <Grid2X2 size={17} aria-hidden="true" />
          تصفّح الأقسام
        </Link>
        <Link to="/offers">
          <BadgePercent size={17} aria-hidden="true" />
          شوف العروض
        </Link>
      </nav>
      <p className="cart-empty-state__note">اختار براحتك، مش لازم تسجّل دخول عشان تضيف للشنطة.</p>
    </section>
  );
}
