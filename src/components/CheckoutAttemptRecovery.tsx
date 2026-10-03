import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';
import { checkoutLines, readPendingCheckout, removePendingCheckout, type PlacedOrder } from '@/lib/checkout';
import { marketplaceCheckoutLines, readPendingMarketplaceCheckout, removePendingMarketplaceCheckout } from '@/lib/marketplaceCheckout';
import { combinedCheckoutSources, readPendingCombinedCheckout, removePendingCombinedCheckout, type PlacedCombinedOrder } from '@/lib/combinedCheckout';
import { recoverCheckout, type CheckoutKind } from '@/lib/checkoutRecovery';

export default function CheckoutAttemptRecovery() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, authLoading } = useUser();
  const { isInitialized, clearCartIfUnchanged } = useCart();

  useEffect(() => {
    if (authLoading || !isInitialized || !user?.id || !navigator.onLine) return;
    const kind: CheckoutKind | null = pathname === '/payment' ? 'owned'
      : pathname === '/marketplace-payment' ? 'marketplace'
      : pathname === '/combined-payment' ? 'combined' : null;
    if (!kind) return;
    const userId = user.id;
    let cancelled = false;

    void (async () => {
      try {
        const owned = kind === 'owned' ? readPendingCheckout(userId) : null;
        const market = kind === 'marketplace' ? readPendingMarketplaceCheckout(userId) : null;
        const combined = kind === 'combined' ? readPendingCombinedCheckout(userId) : null;
        const requestId = owned?.requestId || market?.requestId || combined?.groupId;
        if (!requestId) return;
        const order = await recoverCheckout<PlacedOrder & Partial<PlacedCombinedOrder>>(kind, requestId);
        // Absence is not cancellation: a concurrent submit may still be in flight.
        // Preserve its ID and let the checkout retry the same attempt.
        if (cancelled || !order) return;
        if (owned) removePendingCheckout(userId);
        if (market) removePendingMarketplaceCheckout(userId);
        if (combined) removePendingCombinedCheckout(userId);
        clearCartIfUnchanged(current => {
          try {
            if (owned) return current.every(item => item.commerce_source !== 'marketplace')
              && JSON.stringify(checkoutLines(current)) === JSON.stringify(owned.items);
            if (market) return JSON.stringify(marketplaceCheckoutLines(current)) === JSON.stringify(market.items);
            return JSON.stringify(combinedCheckoutSources(current)) === JSON.stringify(combined!.sources);
          } catch { return false; }
        });
        const leadOrderId = order.orders?.find(child => child.source_kind === 'owned')?.order_id || order.orders?.[0]?.order_id;
        navigate('/order-success', {
          replace: true,
          state: {
            orderId: combined ? leadOrderId : order.id,
            orderGroupId: order.order_group_id,
            orderNumber: order.tracking_number || order.id,
            voucherAmount: Number(order.loyalty_voucher_amount || 0),
            amountDue: Number(order.amount_due ?? order.total),
            combined: Boolean(combined),
            storesCount: order.stores_count,
            recovered: true,
          },
        });
      } catch (error) {
        // Keep unknown outcomes intact; the payment screen provides an explicit retry.
        if (!cancelled) console.error('Checkout recovery unavailable:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [pathname, authLoading, isInitialized, user?.id, clearCartIfUnchanged, navigate]);

  return null;
}
