import { useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { deviceQueryPersister } from '@/lib/deviceQueryCache';
import { clearImageDiskCache } from '@/lib/imageDiskCache';

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} ميجا` : `${Math.max(1, Math.round(bytes / 1024))} كيلو`;

/**
 * Account row: how much the app keeps on this phone (saved screens + images)
 * and a button to clear it. The app keeps working; it just loads from the
 * internet again and saves fresh copies.
 */
export function SavedDataRow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [usage, setUsage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const measure = async () => {
    try {
      const estimate = await navigator.storage?.estimate?.();
      setUsage(typeof estimate?.usage === 'number' ? estimate.usage : null);
    } catch {
      setUsage(null);
    }
  };
  useEffect(() => { void measure(); }, []);

  const clear = async () => {
    if (busy) return;
    if (!window.confirm('تمسح البيانات والصور المحفوظة على الموبايل؟ التطبيق هيحمّلها تاني من النت.')) return;
    setBusy(true);
    try {
      await clearImageDiskCache();
      await deviceQueryPersister.removeClient();
      queryClient.clear();
      toast({ title: 'اتمسحت البيانات المحفوظة' });
      // Reload so every screen fetches fresh data cleanly.
      window.setTimeout(() => window.location.reload(), 600);
    } catch {
      toast({ variant: 'destructive', title: 'تعذّر مسح البيانات المحفوظة' });
      setBusy(false);
      void measure();
    }
  };

  return (
    <button type="button" onClick={clear} disabled={busy} className="acc-row w-full text-right disabled:opacity-60"
      aria-label={`البيانات المحفوظة على الموبايل${usage !== null ? `: ${formatSize(usage)}` : ''}. اضغط للمسح`}>
      <span className="acc-row__icon"><HardDrive size={19} /></span>
      <span className="acc-row__text">
        <strong>البيانات المحفوظة</strong>
        <small>منتجات وصور محفوظة على الموبايل عشان التطبيق يفتح أسرع</small>
      </span>
      <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
        {busy ? 'جاري المسح…' : usage !== null ? formatSize(usage) : 'مسح'}
      </span>
    </button>
  );
}
