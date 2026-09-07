import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, MapPin, Package, Heart, ChevronLeft, Pencil, LogOut, RotateCcw, Plus, Bell } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

const shortcuts = [
  { to: '/orders', label: 'طلباتي', description: 'تابع حالة طلبك وراجع طلباتك السابقة', icon: Package },
  { to: '/favorites', label: 'المفضلة', description: 'منتجاتك المفضلة جاهزة للتسوق', icon: Heart },
];

const Account = () => {
  const { user, authLoading } = useUser();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  const profile = useQuery({
    queryKey: ['account-profile', user?.id],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('name').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const defaultAddress = useQuery({
    queryKey: ['account-default-address', user?.id],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('id, address, areas(name), neighborhoods(name), cities(name)')
        .eq('user_id', user!.id)
        .eq('is_default', true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const name = profile.data?.name || user?.user_metadata?.name || 'أهلًا بيك';
  const address = defaultAddress.data;
  const locationLabel = [address?.cities?.name, address?.areas?.name, address?.neighborhoods?.name]
    .filter(Boolean)
    .join(' - ');

  const logout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/', { replace: true });
    } catch {
      setLogoutError(true);
    } finally {
      setSigningOut(false);
    }
  };

  return <MainLayout>
    <TopNavBar hideLogo hideSearch hideCart pageTitle="حسابي" />
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {authLoading ? <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل حسابك" /></div> : !user ?
        <section className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-primary"><User size={30} /></span>
          <h1 className="text-2xl font-bold">أهلًا بيك في المعداوي</h1>
          <p className="mb-6 mt-3 text-sm leading-7 text-gray-500">سجّل برقم موبايلك عشان تتابع طلباتك وتحفظ عناوينك ومنتجاتك المفضلة.</p>
          <Button className="min-h-12 w-full rounded-xl text-base" onClick={() => navigate('/phone-login')}>تسجيل الدخول أو إنشاء حساب</Button>
          <Link to="/" className="mt-3 flex min-h-12 items-center justify-center rounded-xl text-sm font-semibold text-primary">كمّل تصفح المنتجات</Link>
        </section> : <div className="space-y-6">
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-primary"><User size={30} /></span>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs text-gray-500">حسابك في المعداوي</p>
                <h1 className="break-words text-xl font-bold sm:text-2xl">{profile.isLoading ? 'جاري تحميل بياناتك…' : name}</h1>
                {user.phone && <p dir="ltr" className="mt-2 text-right text-sm text-gray-500">+{user.phone.replace(/^\+/, '')}</p>}
              </div>
            </div>
            {profile.isError && <div role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">تعذّر تحميل بياناتك.<button onClick={() => profile.refetch()} className="mr-2 min-h-11 underline">إعادة المحاولة</button></div>}
            <Link to="/edit-account" className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold transition hover:bg-gray-50"><Pencil size={17} />تعديل بياناتي</Link>
          </section>

          <section className="rounded-3xl border border-green-100 bg-gradient-to-b from-green-50/80 to-white p-5 shadow-sm sm:p-6" aria-label="العنوان الأساسي">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><MapPin size={22} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-primary">العنوان الأساسي</p>
                {defaultAddress.isLoading ? <p className="mt-2 text-sm text-gray-500">جاري تحميل عنوانك…</p> : address ? <>
                  <h2 className="mt-1 font-bold text-gray-900">{locationLabel || 'عنوان التوصيل'}</h2>
                  <p className="mt-2 break-words text-sm leading-6 text-gray-600">{address.address}</p>
                </> : <>
                  <h2 className="mt-1 font-bold text-gray-900">ضيف عنوان التوصيل</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">احفظ عنوانك الأساسي عشان الطلب الجاي يبقى أسرع.</p>
                </>}
                {defaultAddress.isError && <p className="mt-2 text-sm text-amber-800">تعذّر تحميل العنوان حاليًا.</p>}
              </div>
            </div>
            <Link to={address ? '/address-manager' : '/add-address'} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white">
              {address ? <MapPin size={17} /> : <Plus size={17} />}
              {address ? 'إدارة أو تغيير العنوان' : 'إضافة عنوان'}
            </Link>
          </section>

          <section aria-label="التسوق والطلبات" className="grid grid-cols-2 gap-3 sm:gap-4">{shortcuts.map(({ to, label, description, icon: Icon }) => <Link key={to} to={to} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-green-200 sm:p-5"><span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-primary"><Icon size={23} /></span><h2 className="font-bold">{label}</h2><p className="mt-2 text-xs leading-6 text-gray-500">{description}</p></Link>)}</section>

          <section aria-label="إدارة الحساب" className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            {[
              {to:'/notifications',label:'الإشعارات',description:'تابع تحديثات الطلب والدفع أول بأول',icon:Bell},
              {to:'/address-manager',label:'عناوين التوصيل',description:'ضيف عنوان أو اختار عنوانك الافتراضي',icon:MapPin},
              {to:'/return-requests',label:'طلبات الاسترجاع',description:'راجع طلبات الاسترجاع وتابع حالتها',icon:RotateCcw}
            ].map(({to,label,description,icon:Icon}) => <Link key={to} to={to} className="flex min-h-24 items-center gap-3 border-b border-gray-100 p-5 last:border-0 hover:bg-gray-50"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-primary"><Icon size={21} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-gray-500">{description}</span></span><ChevronLeft size={19} className="shrink-0 text-gray-400" /></Link>)}
          </section>

          {logoutError && <p role="alert" className="text-sm text-red-700">تعذّر تسجيل الخروج. راجع اتصالك وحاول تاني.</p>}
          <button disabled={signingOut} onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-white text-sm font-semibold text-red-700 disabled:opacity-50">{signingOut ? <BrandLoader size="sm" /> : <LogOut size={18} />}{signingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}</button>
        </div>}
    </div>
  </MainLayout>;
};

export default Account;
