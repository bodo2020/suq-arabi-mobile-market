import { Bell, Gift, Package, RotateCcw, Sparkles, UserRound, type LucideIcon } from 'lucide-react';

export type NotificationTone = 'green' | 'gold' | 'blue' | 'mint' | 'red';

export type NotificationMeta = { label: string; icon: LucideIcon; tone: NotificationTone };

/** One look per notification type, shared by the page and the in-app pop-up. */
export function notificationMeta(category: string, severity?: string): NotificationMeta {
  const base: NotificationMeta =
    category === 'orders' ? { label: 'الطلبات', icon: Package, tone: 'green' }
      : category === 'marketing' ? { label: 'العروض', icon: Sparkles, tone: 'gold' }
        : category === 'loyalty' ? { label: 'النقاط', icon: Gift, tone: 'gold' }
          : category === 'returns' ? { label: 'المرتجعات', icon: RotateCcw, tone: 'blue' }
            : category === 'customers' ? { label: 'حسابك', icon: UserRound, tone: 'mint' }
              : { label: 'إشعار', icon: Bell, tone: 'mint' };
  return severity === 'critical' ? { ...base, tone: 'red' } : base;
}

/** "من ٥ دقايق" style time, falling back to a date for older items. */
export function relativeTime(value: string, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const minutes = Math.max(0, Math.round((now - time) / 60000));
  const n = (x: number) => x.toLocaleString('ar-EG');
  if (minutes < 1) return 'دلوقتي';
  if (minutes < 60) return minutes === 1 ? 'من دقيقة' : minutes === 2 ? 'من دقيقتين' : `من ${n(minutes)} دقايق`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'من ساعة' : hours === 2 ? 'من ساعتين' : `من ${n(hours)} ساعات`;
  try {
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  } catch {
    return '';
  }
}

/** Group label for the list: النهارده / امبارح / الأسبوع ده / أقدم. */
export function dayGroup(value: string, now = new Date()): string {
  const date = new Date(value);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = date.getTime();
  if (t >= startOfToday) return 'النهارده';
  if (t >= startOfToday - 86400000) return 'امبارح';
  if (t >= startOfToday - 6 * 86400000) return 'الأسبوع ده';
  return 'أقدم';
}

export function notificationTarget(item: { action_url: string | null; metadata?: Record<string, unknown> }): string | null {
  if (item.action_url?.startsWith('/')) return item.action_url;
  const orderId = typeof item.metadata?.order_id === 'string' ? item.metadata.order_id : null;
  return orderId ? `/orders?order_id=${encodeURIComponent(orderId)}` : null;
}
