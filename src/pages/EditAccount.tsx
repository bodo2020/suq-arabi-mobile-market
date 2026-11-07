import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, UserRound, Phone, Mail, MapPin, ChevronLeft } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import AccountHero from '@/components/account/AccountHero';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { invalidateMyAddresses, invalidateMyCustomer } from '@/lib/customerProfileCache';

const EditAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUserData = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!mounted) return;

      if (authError || !authData.user) {
        navigate('/phone-login', { replace: true });
        return;
      }

      const authUser = authData.user;
      setUserId(authUser.id);
      setPhone(authUser.phone || '');
      setEmail(authUser.email || '');

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('name, phone, email')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (customerError) console.error('Error loading customer profile:', customerError);

      if (customerData) {
        setName(customerData.name || '');
        setPhone(authUser.phone || customerData.phone || '');
        setEmail(authUser.email || customerData.email || '');
      }

      setLoading(false);
    };

    void loadUserData();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !userId) return;

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      toast({ title: 'اكتب اسمك بشكل صحيح', description: 'الاسم لازم يكون حرفين على الأقل.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: customerError } = await supabase
        .from('customers')
        .update({ name: cleanName })
        .eq('user_id', userId);
      invalidateMyCustomer();
      if (customerError) throw customerError;

      const { error: authMetadataError } = await supabase.auth.updateUser({ data: { name: cleanName } });
      if (authMetadataError) throw authMetadataError;

      localStorage.setItem('userName', cleanName);
      if (phone) localStorage.setItem('userPhone', phone);
      if (email) localStorage.setItem('userEmail', email);

      toast({ title: 'تم حفظ بياناتك', description: 'بيانات حسابك اتحدثت بنجاح.' });
      navigate('/account');
    } catch (error: any) {
      console.error('Error updating user data:', error);
      toast({
        title: 'تعذر حفظ التعديلات',
        description: error?.message || 'حدث خطأ أثناء تحديث البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <TopNavBar variant="title" hideLogo hideSearch hideCart pageTitle="تعديل بياناتي" showBackButton onBack={() => navigate('/account')} />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {loading ? <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل بيانات الحساب" /></div> : <div className="space-y-5">
          <AccountHero
            icon={UserRound}
            eyebrow="بيانات الحساب"
            title="خلّي بياناتك محدثة"
            subtitle="اسمك ورقمك هما اللي بنستخدمهم في الطلب والتواصل."
          />
          <section className="acc-card p-5 sm:p-7">

            <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isSubmitting}>
              <div>
                <label htmlFor="name" className="mb-2 flex items-center gap-2 text-sm font-semibold"><User size={18} className="text-primary" />الاسم</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-right outline-none transition focus:border-primary"
                  placeholder="اكتب اسمك"
                  autoComplete="name"
                />
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Phone size={18} className="text-primary" />رقم الهاتف</div>
                  <Link to="/change-phone" className="text-sm font-semibold text-primary">تغيير الرقم</Link>
                </div>
                <p dir="ltr" className="break-all text-right font-medium text-gray-800">{phone || 'غير متاح'}</p>
                <p className="mt-2 text-xs leading-5 text-gray-500">تغيير رقم الهاتف يتم بكود تحقق على الرقم الجديد.</p>
              </div>

              {email && <div className="rounded-2xl border border-gray-100 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Mail size={18} className="text-primary" />البريد الإلكتروني</div>
                <p dir="ltr" className="break-all text-right text-sm text-gray-700">{email}</p>
              </div>}

              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-white disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? <BrandLoader size="sm" /> : 'حفظ التعديلات'}
              </button>
            </form>
          </section>

          <Link to="/address-manager" className="flex min-h-20 items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-primary"><MapPin size={21} /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm">إدارة عناوين التوصيل</strong><span className="mt-1 block text-xs text-gray-500">ضيف أو عدّل وحدد عنوانك الأساسي</span></span>
            <ChevronLeft size={18} className="text-gray-400" />
          </Link>
        </div>}
      </div>
    </MainLayout>
  );
};

export default EditAccount;
