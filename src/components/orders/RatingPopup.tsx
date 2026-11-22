import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import OrderRatingPanel from '@/components/orders/OrderRatingPanel';
import { getMyOrderRating } from '@/lib/orderRating';

export type RatableOrder = { orderId: string; hasDriver: boolean };

const skipKey = (orderId: string) => `ratingSkipped:${orderId}`;
const isSkipped = (orderId: string) => { try { return localStorage.getItem(skipKey(orderId)) === '1'; } catch { return false; } };
const markSkipped = (orderId: string) => { try { localStorage.setItem(skipKey(orderId), '1'); } catch { /* private mode */ } };

/** Pops up for the first delivered order the customer has not rated yet (closing it counts as "later" for that order). */
export default function RatingPopup({ orders }: { orders: RatableOrder[] }) {
  const [target, setTarget] = useState<RatableOrder | null>(null);
  const ids = orders.map(order => order.orderId).join(',');

  useEffect(() => {
    let active = true;
    (async () => {
      for (const order of orders) {
        if (isSkipped(order.orderId)) continue;
        try {
          if (!(await getMyOrderRating(order.orderId))) {
            if (active) setTarget(order);
            return;
          }
        } catch { /* try the next one */ }
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids is the stable key of orders
  }, [ids]);

  const close = () => {
    if (target) markSkipped(target.orderId);
    setTarget(null);
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={open => { if (!open) close(); }}>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader className="text-right">
          <DialogTitle>قيّم طلبك</DialogTitle>
          <DialogDescription>رأيك بيساعدنا نحسّن الخدمة. لو الطلب ما عجبكش قولنا ليه.</DialogDescription>
        </DialogHeader>
        {target && (
          <OrderRatingPanel
            key={target.orderId}
            orderId={target.orderId}
            hasDriver={target.hasDriver}
            onDone={() => setTarget(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
