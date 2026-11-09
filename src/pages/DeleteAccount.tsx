import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Trash2, XCircle } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { clearPersonalQueries } from '@/lib/deviceQueryCache';
import '@/components/account/account.css';

const REFUSALS: Record<string, string> = {
  ACTIVE_ORDERS: 'عندك طلب لسه شغال. استنى لما يوصلك أو يتلغي، وبعدها تقدر تحذف حسابك.',
  OPEN_BALANCE: 'عليك مبلغ آجل للفرع. سدّده الأول، وبعدها تقدر تحذف حسابك.',
  STAFF_ACCOUNT: 'الحساب ده مربوط بحساب موظف في المحل، فمينفعش يتحذف من التطبيق. كلّم إدارة المحل.',
};

/**
 * Google Play requirement: the customer can delete their account from the
 * app. The server (delete_my_customer_account_v1) removes the login and the
 * personal data; orders and invoices are kept without name, phone or address.
 */
export default function DeleteAccount() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, loading } = useUser();
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && !user) return <Navigate to="/account" replace />;

  const remove = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('delete_my_customer_account_v1' as never);
      if (rpcError) throw rpcError;
      const result = (data || {}) as { ok?: boolean; reason?: string };
      if (!result.ok) {
        setError(REFUSALS[result.reason || ''] || 'تعذّر حذف الحساب. حاول تاني بعد شوية.');
        return;
      }
      // The login no longer exists on the server; clear this phone's copy.
      clearPersonalQueries(queryClient);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      toast({ title: 'اتحذف حسابك', description: 'شكرًا إنك جرّبت سوبر ماركو.' });
      navigate('/', { replace: true });
    } catch {
      setError('تعذّر حذف الحساب. راجع اتصالك بالإنترنت وحاول تاني.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MainLayout>
      <TopNavBar variant="title" hideLogo hideSearch hideCart pageTitle="حذف الحساب" />
      <div className="mx-auto max-w-2xl space-y-3 px-4 pb-10 pt-4" dir="rtl">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري التحميل" /></div>
        ) : (
          <>
            <section className="acc-card space-y-3 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300"><AlertTriangle size={22} /></span>
                <div>
                  <h1 className="text-lg font-black">متأكد إنك عاوز تحذف حسابك؟</h1>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">الحذف نهائي ومينفعش يترجع. لو حبيت ترجع بعد كده، هتعمل حساب جديد من الأول.</p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-extrabold">هيتحذف:</p>
                <ul className="space-y-1.5 text-sm leading-6">
                  {['اسمك ورقم موبايلك وتسجيل الدخول', 'عناوين التوصيل', 'الشنطة والمفضلة', 'نقاطك وكوبوناتك اللي لسه ما استخدمتهاش', 'الإشعارات وتنبيهات رجوع المنتجات'].map(item => (
                    <li key={item} className="flex items-start gap-2"><XCircle size={16} className="mt-1 shrink-0 text-red-500" />{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-extrabold">هيفضل عندنا (من غير اسمك أو رقمك أو عنوانك):</p>
                <ul className="space-y-1.5 text-sm leading-6 text-muted-foreground">
                  <li className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" />فواتير وطلبات قديمة، لأن المحل ملزم يحتفظ بالحسابات</li>
                </ul>
              </div>
            </section>

            <label className="acc-card flex cursor-pointer items-start gap-3 p-4 text-sm leading-6">
              <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-red-600" />
              <span>فهمت إن الحذف نهائي، وإن نقاطي وكوبوناتي هتضيع.</span>
            </label>

            {error && <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{error}</p>}

            <button
              type="button"
              disabled={!confirmed || deleting}
              onClick={remove}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 text-base font-extrabold text-white transition disabled:opacity-40"
            >
              {deleting ? <BrandLoader size="sm" /> : <Trash2 size={18} />}
              {deleting ? 'جاري حذف الحساب…' : 'احذف حسابي نهائيًا'}
            </button>
            <Link to="/account" className="flex h-11 w-full items-center justify-center rounded-2xl text-sm font-bold text-muted-foreground">رجوع لحسابي</Link>
          </>
        )}
      </div>
    </MainLayout>
  );
}
