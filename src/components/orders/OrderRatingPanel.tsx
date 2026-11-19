import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  DRIVER_TAGS,
  DRIVER_TAGS_LOW,
  ORDER_TAGS,
  ORDER_TAGS_LOW,
  getMyOrderRating,
  ratingErrorMessage,
  submitMyOrderRating,
  type MyOrderRating,
} from '@/lib/orderRating';

type Props = { orderId: string; hasDriver: boolean };

function Stars({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex justify-center gap-1.5" dir="ltr">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} من 5`}
          onClick={() => onChange(n)}
          className="min-h-11 min-w-11 rounded-full p-1.5"
        >
          <Star size={30} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
        </button>
      ))}
    </div>
  );
}

function TagPicker({ tags, picked, onToggle }: { tags: string[]; picked: string[]; onToggle: (tag: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {tags.map(tag => (
        <button
          key={tag}
          type="button"
          onClick={() => onToggle(tag)}
          aria-pressed={picked.includes(tag)}
          className={`min-h-10 rounded-full border px-3 text-sm ${picked.includes(tag) ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-gray-200 text-gray-600'}`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

const toggle = (list: string[], tag: string) => (list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]);

/** Rate a delivered order and (when there was one) the driver. Shown once; afterwards it shows the given stars. */
export default function OrderRatingPanel({ orderId, hasDriver }: Props) {
  const { toast } = useToast();
  const [existing, setExisting] = useState<MyOrderRating | null | undefined>(undefined);
  const [orderStars, setOrderStars] = useState(0);
  const [driverStars, setDriverStars] = useState(0);
  const [orderTags, setOrderTags] = useState<string[]>([]);
  const [driverTags, setDriverTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    getMyOrderRating(orderId)
      .then(value => { if (active) setExisting(value); })
      .catch(() => { if (active) setExisting(null); });
    return () => { active = false; };
  }, [orderId]);

  if (existing === undefined) return null;

  if (existing) {
    return (
      <section className="mt-5 rounded-2xl bg-green-50 p-4 text-center" aria-label="تقييمك">
        <p className="text-sm font-semibold text-green-800">شكرًا على تقييمك</p>
        <div className="mt-2 flex justify-center gap-1" dir="ltr" aria-label={`${existing.order_stars} من 5`}>
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} size={20} className={n <= existing.order_stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
          ))}
        </div>
      </section>
    );
  }

  const submit = async () => {
    if (!orderStars || sending) return;
    setSending(true);
    try {
      const result = await submitMyOrderRating({
        orderId,
        orderStars,
        driverStars: hasDriver && driverStars ? driverStars : null,
        comment,
        orderTags,
        driverTags,
      });
      setExisting({ order_stars: orderStars, driver_stars: driverStars || null, comment: comment || null, created_at: new Date().toISOString() });
      toast({ title: result.already_rated ? 'اتقيّم قبل كده' : 'شكرًا على رأيك' });
    } catch (error) {
      toast({ title: ratingErrorMessage(error instanceof Error ? error.message : ''), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-4" aria-label="قيّم طلبك">
      <h3 className="text-center text-base font-bold">قيّم طلبك</h3>
      <p className="mt-1 text-center text-xs text-gray-500">رأيك بيساعدنا نحسّن الخدمة.</p>

      <div className="mt-4">
        <p className="mb-1 text-center text-sm font-semibold">الطلب (المنتجات والتغليف)</p>
        <Stars value={orderStars} onChange={setOrderStars} label="تقييم الطلب" />
        {orderStars > 0 && <TagPicker tags={orderStars <= 3 ? ORDER_TAGS_LOW : ORDER_TAGS} picked={orderTags} onToggle={tag => setOrderTags(list => toggle(list, tag))} />}
      </div>

      {hasDriver && (
        <div className="mt-5">
          <p className="mb-1 text-center text-sm font-semibold">المندوب</p>
          <Stars value={driverStars} onChange={setDriverStars} label="تقييم المندوب" />
          {driverStars > 0 && <TagPicker tags={driverStars <= 3 ? DRIVER_TAGS_LOW : DRIVER_TAGS} picked={driverTags} onToggle={tag => setDriverTags(list => toggle(list, tag))} />}
        </div>
      )}

      {orderStars > 0 && (
        <textarea
          value={comment}
          onChange={event => setComment(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder="تحب تضيف حاجة؟ (اختياري)"
          className="mt-4 w-full rounded-xl border p-3 text-base"
        />
      )}

      <Button className="mt-4 min-h-12 w-full rounded-xl" disabled={!orderStars || sending} onClick={() => void submit()}>
        {sending ? 'جاري الإرسال…' : 'إرسال التقييم'}
      </Button>
    </section>
  );
}
