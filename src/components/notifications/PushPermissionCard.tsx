import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import BrandLoader from '@/components/ui/BrandLoader';
import { useToast } from '@/hooks/use-toast';
import { getNativePushPermission, requestCustomerPushPermissionAndRegister } from '@/services/pushNotifications';

type State = 'loading' | 'prompt' | 'denied' | 'hidden';

/**
 * Notification center: lets a customer turn phone notifications on later
 * (the one-time prompt after sign-in may have been missed or dismissed).
 * Hidden on the web, in builds without push, and once permission is granted.
 */
export default function PushPermissionCard() {
  const { toast } = useToast();
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void getNativePushPermission()
      .then(result => { if (alive) setState(result === 'prompt' ? 'prompt' : result === 'denied' ? 'denied' : 'hidden'); })
      .catch(() => { if (alive) setState('hidden'); });
    return () => { alive = false; };
  }, []);

  if (state === 'loading' || state === 'hidden') return null;

  const enable = async () => {
    setBusy(true);
    try {
      const result = await requestCustomerPushPermissionAndRegister();
      if (result === 'granted') {
        setState('hidden');
        toast({ title: 'تم تفعيل الإشعارات', description: 'هيوصلك تحديث طلبك والعروض المهمة على الموبايل.' });
      } else {
        setState(result === 'denied' ? 'denied' : 'hidden');
      }
    } catch {
      toast({ title: 'تعذّر تفعيل الإشعارات', description: 'حاول تاني بعد شوية.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-right">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#005931]"><BellRing size={20} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-extrabold text-[#10241a]">فعّل إشعارات الموبايل</h2>
        {state === 'prompt' ? (
          <>
            <p className="mt-1 text-[13px] leading-6 text-slate-600">عشان يوصلك تنبيه أول ما حالة طلبك تتغير، وتعرف العروض أول بأول.</p>
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#005931] px-4 text-sm font-bold text-white disabled:opacity-70"
            >
              {busy && <BrandLoader size="sm" tone="onGreen" />}
              {busy ? 'جاري التفعيل…' : 'فعّل الإشعارات'}
            </button>
          </>
        ) : (
          <p className="mt-1 text-[13px] leading-6 text-slate-600">
            الإشعارات مقفولة للتطبيق. افتح <strong>إعدادات الموبايل ← التطبيقات ← سوبر ماركو ← الإشعارات</strong> وفعّلها.
          </p>
        )}
      </div>
    </section>
  );
}
