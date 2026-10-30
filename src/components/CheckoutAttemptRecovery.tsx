import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import {
  checkoutLines,
  readPendingCheckout,
  reconcilePendingCheckoutAttempt,
  removePendingCheckout,
} from '@/lib/checkout';

const RECOVERED_FLAG = 'checkout-attempt-recovered';

export default function CheckoutAttemptRecovery() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authLoading } = useUser();
  const { items, isInitialized, clearCart } = useCart();
  const { toast } = useToast();
  const resolvingRequestId = useRef<string | null>(null);

  useEffect(() => {
    if (location.pathname !== '/payment') return;
    const recovered = sessionStorage.getItem(RECOVERED_FLAG);
    if (!recovered) return;
    sessionStorage.removeItem(RECOVERED_FLAG);
    toast({
      title: 'المحاولة السابقة اتقفلت بأمان',
      description: 'مفيش طلب اتنشأ منها، وتقدر دلوقتي تغيّر العنوان أو كوبون الخصم وتأكد الطلب من جديد.',
    });
  }, [location.pathname, toast]);

  useEffect(() => {
    if (location.pathname !== '/payment' || authLoading || !isInitialized || !user?.id) return;

    let pending;
    try {
      pending = readPendingCheckout(user.id);
    } catch {
      removePendingCheckout(user.id);
      sessionStorage.setItem(RECOVERED_FLAG, '1');
      window.location.reload();
      return;
    }

    if (!pending || resolvingRequestId.current === pending.requestId) return;
    resolvingRequestId.current = pending.requestId;
    let cancelled = false;

    void (async () => {
      try {
        const result = await reconcilePendingCheckoutAttempt(pending.requestId);
        if (cancelled) return;

        if (result.exists && result.id) {
          removePendingCheckout(user.id);
          const currentLines = checkoutLines(items);
          if (JSON.stringify(currentLines) === JSON.stringify(pending.items)) clearCart();
          navigate('/order-success', {
            replace: true,
            state: {
              orderId: result.id,
              orderNumber: result.tracking_number || result.id,
              voucherAmount: Number(result.loyalty_voucher_amount || 0),
              amountDue: Number(result.amount_due ?? Math.max(0, Number(result.total || 0) - Number(result.loyalty_voucher_amount || 0))),
              recovered: true,
            },
          });
          return;
        }

        // A negative lookup might race a delayed original request. Preserve the
        // pending request ID; only the same ID may be safely retried.
        toast({
          title: 'المحاولة السابقة لسه محفوظة',
          description: 'مفيش طلب مؤكد لحد دلوقتي. اضغط «تأكيد الطلب» عشان نستكمل نفس المحاولة بأمان.',
        });
      } catch (error) {
        resolvingRequestId.current = null;
        console.error('Checkout attempt reconciliation failed:', error);
        toast({
          title: 'تعذر مراجعة المحاولة السابقة',
          description: 'المحاولة ما زالت محمية مؤقتًا. جرّب تحديث الصفحة بعد لحظات.',
          variant: 'destructive',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, authLoading, isInitialized, user?.id, items, clearCart, navigate, toast]);

  return null;
}
