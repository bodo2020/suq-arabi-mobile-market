import { Link } from 'react-router-dom';
import { ArrowLeft, BadgePercent, Grid2X2 } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import './cart-empty-motion.css';

/**
 * Empty-state microinteraction only: never changes the immutable BrandMark.
 * The original smile is temporarily hidden while a traced + occupies its
 * exact position, then the original smile returns.
 */
export default function CartEmptyState() {
  return (
    <section className="cart-empty-state" aria-labelledby="cart-empty-heading">
      <div className="cart-empty-scene" aria-hidden="true">
        <span className="cart-empty-scene__halo" />
        <span className="cart-empty-bag">
          <BrandMark variant="mark" motion="reveal" className="cart-empty-bag__mark" />
          <svg className="cart-empty-bag__plus" viewBox="0 0 121 161" fill="none" focusable="false" aria-hidden="true">
            <path className="cart-empty-plus-line cart-empty-plus-line--horizontal" pathLength={100} d="M49 74H72" stroke="#FFC120" strokeWidth={8} strokeLinecap="round" />
            <path className="cart-empty-plus-line cart-empty-plus-line--vertical" pathLength={100} d="M60.5 62.5V85.5" stroke="#FFC120" strokeWidth={8} strokeLinecap="round" />
          </svg>
        </span>
      </div>

      <h1 id="cart-empty-heading">سلتك لسه فاضية</h1>
      <p className="cart-empty-state__description">
        دوس على علامة + جنب أي منتج يعجبك،
        <span className="cart-empty-state__description-line">وهتلاقيه هنا على طول.</span>
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
      <p className="cart-empty-state__note">اختار براحتك، مش لازم تسجّل دخول عشان تضيف للسلة.</p>
    </section>
  );
}
