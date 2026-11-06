import { useEffect, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import './order-celebration.css';

const CONFETTI = [
  { x: -118, y: -86, r: 220, c: '#FFC120' }, { x: 112, y: -98, r: -160, c: '#fff' },
  { x: -140, y: 6, r: 140, c: '#fff' }, { x: 138, y: -8, r: -210, c: '#FFC120' },
  { x: -82, y: -132, r: 90, c: '#9be3b9' }, { x: 74, y: -138, r: -90, c: '#FFC120' },
  { x: -104, y: 78, r: 260, c: '#FFC120' }, { x: 100, y: 84, r: -250, c: '#9be3b9' },
  { x: -22, y: -150, r: 180, c: '#fff' }, { x: 30, y: 122, r: -120, c: '#fff' },
  { x: -150, y: -46, r: 60, c: '#9be3b9' }, { x: 150, y: 44, r: -60, c: '#fff' },
];

const PLAY_MS = 2700;
const LEAVE_MS = 460;

/**
 * Full-screen "order confirmed" moment: a green wave rises from the confirm
 * button, the Super Marko bag draws itself and lands, a gold check stamps it,
 * confetti bursts, then the overlay lifts to reveal the order details.
 * Tap anywhere to skip. Transform/opacity/clip-path only.
 */
export default function OrderCelebration({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), PLAY_MS);
    return () => window.clearTimeout(leave);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const done = window.setTimeout(onDone, LEAVE_MS);
    return () => window.clearTimeout(done);
  }, [leaving, onDone]);

  return (
    <div
      className={`order-celebration ${leaving ? 'is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      onClick={() => setLeaving(true)}
    >
      <div className="order-celebration__stage" aria-hidden="true">
        <span className="order-celebration__ring" />
        <span className="order-celebration__ring order-celebration__ring--late" />
        <span className="order-celebration__shadow" />
        <span className="order-celebration__bag">
          <BrandMark variant="mark" tone="onGreen" motion="reveal" className="order-celebration__mark" />
        </span>
        <span className="order-celebration__check"><Check size={26} strokeWidth={3.4} /></span>
        <span className="order-celebration__confetti">
          {CONFETTI.map((piece, index) => (
            <i
              key={index}
              style={{ '--x': `${piece.x}px`, '--y': `${piece.y}px`, '--r': `${piece.r}deg`, '--c': piece.c, '--d': `${(index % 4) * 40}ms` } as CSSProperties}
            />
          ))}
        </span>
      </div>
      <p className="order-celebration__title">طلبك اتأكد!</p>
      <p className="order-celebration__sub">بنجهّزهولك دلوقتي وهيوصلك على طول</p>
    </div>
  );
}
