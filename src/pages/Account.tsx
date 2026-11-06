import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChevronLeft,
  Heart,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Ticket,
  UserRound,
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import BrandMark from '@/components/brand/BrandMark';
import LoyaltyBarcode from '@/components/ui/LoyaltyBarcode';
import AccountHero from '@/components/account/AccountHero';
import BrandText from '@/components/brand/BrandText';
import { supabase } from '@/lib/supabase';
import { getMyLoyaltyCard } from '@/lib/loyalty';
import '@/components/account/account.css';

const number = (value: number, digits = 0) => Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: digits });

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

  const loyalty = useQuery({
    queryKey: ['customer-loyalty-card', user?.id],
    enabled: !!user && !authLoading,
    queryFn: getMyLoyaltyCard,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
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
  const firstName = String(name).trim().split(/\s+/)[0] || name;
  const initial = String(name).trim().charAt(0) || '؟';
  const address = defaultAddress.data;
  const locationLabel = [address?.areas?.name, address?.neighborhoods?.name].filter(Boolean).join('، ');
  const card = loyalty.data;

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

  return (
    <MainLayout>
      <TopNavBar variant="title" hideLogo hideSearch hideCart pageTitle="حسابي" />
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-4" dir="rtl">
        {authLoading ? (
          <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل حسابك" /></div>
        ) : !user ? (
          <div className="acc-stack space-y-3">
            <AccountHero
              badge={<BrandMark variant="mark" className="h-8 w-8" />}
              eyebrow="أهلًا بيك في سوبر ماركو"
              title="سجّل وخلّي كل حاجة محفوظة"
              subtitle="تابع طلباتك ونقاطك، واحفظ عناوينك والمنتجات اللي بتحبها."
              actions={<>
                <button type="button" className="acc-hero__btn acc-hero__btn--gold" onClick={() => navigate('/phone-login')}>تسجيل الدخول أو إنشاء حساب</button>
                <Link to="/" className="acc-hero__btn">كمّل تسوّق</Link>
              </>}
            />
          </div>
        ) : (
          <div className="acc-stack space-y-3">
            {/* Who you are + your points */}
            <AccountHero
              badge={<span className="text-2xl font-black">{initial}</span>}
              eyebrow="حسابك في سوبر ماركو"
              title={profile.isLoading ? 'بنحمّل بياناتك…' : `أهلًا، ${firstName}`}
              subtitle={user.phone ? <span dir="ltr">+{user.phone.replace(/^\+/, '')}</span> : undefined}
              stats={loyalty.data ? [
                { label: 'رصيد نقاطك', value: <span key={Number(loyalty.data.points_balance || 0)} className="brand-quantity-pop inline-block">{number(loyalty.data.points_balance)}</span>, unit: 'نقطة' },
                { label: 'تقدر تحوّله لكوبون', value: <span key={Number(loyalty.data.redeemable_credit_egp || 0)} className="brand-quantity-pop inline-block">{number(loyalty.data.redeemable_credit_egp, 2)}</span>, unit: 'ج.م' },
              ] : undefined}
              actions={<Link to="/edit-account" className="acc-hero__btn"><Pencil size={15} />تعديل بياناتي</Link>}
            />
            {profile.isError && <div role="alert" className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">تعذّر تحميل بياناتك.<button onClick={() => profile.refetch()} className="mr-2 underline">إعادة المحاولة</button></div>}

            {/* Membership card with the barcode for the cashier */}
            <section className="acc-member" aria-label="بطاقة سوبر ماركو">
              <div className="acc-member__band">
                <strong>بطاقة <BrandText tone="gold">سوبر ماركو</BrandText></strong>
                {card?.membership_number && <span dir="ltr">{card.membership_number}</span>}
              </div>
              <div className="acc-member__body">
                {loyalty.isLoading ? (
                  <div className="acc-skeleton h-24" />
                ) : loyalty.isError || !card ? (
                  <p className="rounded-2xl bg-gray-50 p-4 text-center text-sm text-gray-600">
                    تعذّر تحميل البطاقة حاليًا.
                    <button onClick={() => loyalty.refetch()} className="mr-2 font-bold text-[#005931] underline">إعادة المحاولة</button>
                  </p>
                ) : (
                  <>
                    <p className="acc-member__hint">ورّي الباركود للكاشير وانت بتدفع في الفرع</p>
                    <LoyaltyBarcode value={card.barcode_token} />
                  </>
                )}
                <div className="acc-member__actions">
                  <Link to="/vouchers" className="acc-member__primary"><Ticket size={17} />حوّل نقاطك</Link>
                  <Link to="/vouchers" className="acc-member__secondary">كوبوناتي</Link>
                </div>
              </div>
            </section>

            {/* Quick tiles */}
            <nav className="acc-tiles" aria-label="التسوق">
              <Link to="/orders" className="acc-tile"><span className="acc-tile__icon"><Package size={22} /></span>مشترياتي</Link>
              <Link to="/vouchers" className="acc-tile acc-tile--gold"><span className="acc-tile__icon"><Ticket size={22} /></span>كوبوناتي</Link>
              <Link to="/favorites" className="acc-tile acc-tile--rose"><span className="acc-tile__icon"><Heart size={22} /></span>المفضلة</Link>
            </nav>

            {/* Default address */}
            <Link to={address ? '/address-manager' : '/add-address'} className="acc-card acc-row !min-h-[76px]">
              <span className="acc-row__icon"><MapPin size={20} /></span>
              <span className="acc-row__text">
                <strong>{defaultAddress.isLoading ? 'بنحمّل عنوانك…' : address ? (locationLabel || 'عنوان التوصيل') : 'ضيف عنوان التوصيل'}</strong>
                <small>{address ? address.address : 'احفظ عنوانك عشان طلبك الجاي يبقى أسرع'}</small>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#e8f5ee] px-3 py-1.5 text-xs font-extrabold text-[#005931]">
                {address ? 'تغيير' : <><Plus size={14} />إضافة</>}
              </span>
            </Link>

            {/* Settings */}
            <p className="acc-section-title">حسابك</p>
            <nav className="acc-card overflow-hidden" aria-label="إدارة الحساب">
              {[
                { to: '/notifications', label: 'الإشعارات', description: 'تحديثات طلباتك والعروض', icon: Bell },
                { to: '/address-manager', label: 'عناوين التوصيل', description: 'ضيف عنوان أو اختار الافتراضي', icon: MapPin },
                { to: '/return-requests', label: 'طلبات الاسترجاع', description: 'تابع حالة أي استرجاع', icon: RotateCcw },
                { to: '/edit-account', label: 'بياناتي', description: 'الاسم ورقم الموبايل', icon: UserRound },
              ].map(({ to, label, description, icon: Icon }) => (
                <Link key={to} to={to} className="acc-row">
                  <span className="acc-row__icon"><Icon size={19} /></span>
                  <span className="acc-row__text"><strong>{label}</strong><small>{description}</small></span>
                  <ChevronLeft size={18} className="acc-row__chev" />
                </Link>
              ))}
              <button type="button" disabled={signingOut} onClick={logout} className="acc-row acc-row--danger w-full text-right disabled:opacity-60">
                <span className="acc-row__icon">{signingOut ? <BrandLoader size="sm" /> : <LogOut size={19} />}</span>
                <span className="acc-row__text"><strong>{signingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}</strong></span>
              </button>
            </nav>
            {logoutError && <p role="alert" className="text-sm text-red-700">تعذّر تسجيل الخروج. راجع اتصالك وحاول تاني.</p>}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Account;
