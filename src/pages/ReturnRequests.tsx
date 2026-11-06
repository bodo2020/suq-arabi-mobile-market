import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, PackageOpen, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import AccountHero from '@/components/account/AccountHero';
import ReturnRequestDetails from '@/components/ui/ReturnRequestDetails';
import { ReturnRequest, ReturnRequestStatus, supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

type Filter = 'all' | ReturnRequestStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'قيد المراجعة' },
  { key: 'approved', label: 'مقبولة' },
  { key: 'rejected', label: 'مرفوضة' },
];

const ReturnRequests = () => {
  const navigate = useNavigate();
  const { user, session, authLoading } = useUser();
  const [filter, setFilter] = useState<Filter>('all');

  const {
    data: requests = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['return-requests', user?.id],
    queryFn: async (): Promise<ReturnRequest[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('return_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ReturnRequest[];
    },
    enabled: !!user && !!session && !authLoading,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const counts = {
    pending: requests.filter(request => request.status === 'pending').length,
    approved: requests.filter(request => request.status === 'approved').length,
    rejected: requests.filter(request => request.status === 'rejected').length,
  };

  const visibleRequests = filter === 'all'
    ? requests
    : requests.filter(request => request.status === filter);

  return (
    <MainLayout>
      <TopNavBar variant="title" hideLogo hideSearch hideCart pageTitle="طلبات الاسترجاع" showBackButton onBack={() => navigate('/account')} />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {authLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <BrandLoader label="جاري تحميل طلبات الاسترجاع" />
          </div>
        ) : !session || !user ? (
          <section className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-primary">
              <RotateCcw size={30} />
            </span>
            <h1 className="text-2xl font-bold">طلبات الاسترجاع محفوظة في حسابك</h1>
            <p className="mb-6 mt-3 text-sm leading-7 text-gray-500">
              سجّل دخولك عشان تنشئ طلب استرجاع وتتابع نتيجة المراجعة.
            </p>
            <Button className="min-h-12 w-full rounded-xl text-base" onClick={() => navigate('/phone-login')}>
              تسجيل الدخول
            </Button>
          </section>
        ) : (
          <div className="space-y-5">
            <AccountHero
              icon={RotateCcw}
              title="طلبات الاسترجاع"
              subtitle="تابع أي استرجاع من وقت ما تبعته لحد قرار المراجعة."
              stats={!isLoading && !isError ? [
                { label: 'قيد المراجعة', value: Number(counts.pending).toLocaleString('ar-EG') },
                { label: 'مقبولة', value: Number(counts.approved).toLocaleString('ar-EG') },
                { label: 'مرفوضة', value: Number(counts.rejected).toLocaleString('ar-EG') },
              ] : undefined}
              actions={<>
                <button type="button" className="acc-hero__btn" disabled={isFetching} onClick={() => void refetch()}><RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />تحديث</button>
                <button type="button" className="acc-hero__btn" onClick={() => navigate('/orders')}>مشترياتي</button>
              </>}
            />

            <div className="acc-tabs grid-cols-2 sm:grid-cols-4">
              {FILTERS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${filter === item.key ? 'is-active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center">
                <BrandLoader label="جاري تحميل طلبات الاسترجاع" />
              </div>
            ) : isError ? (
              <section role="alert" className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
                <XCircle className="mx-auto text-red-500" size={36} />
                <h2 className="mt-4 text-xl font-bold">تعذّر تحميل طلبات الاسترجاع</h2>
                <p className="my-3 text-sm text-gray-500">راجع اتصالك وحاول مرة تانية.</p>
                <Button className="mt-2 rounded-xl" onClick={() => void refetch()}>إعادة المحاولة</Button>
              </section>
            ) : requests.length === 0 ? (
              <section className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                  <PackageOpen size={30} />
                </span>
                <h2 className="mt-4 text-xl font-bold">مفيش طلبات استرجاع لسه</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  لو محتاج ترجع منتج من طلب تم تسليمه، افتح الطلب من «طلباتي» واختار المنتجات اللي محتاج ترجعها.
                </p>
                <Button className="mt-6 min-h-12 rounded-xl px-8" onClick={() => navigate('/orders')}>
                  فتح طلباتي
                </Button>
              </section>
            ) : visibleRequests.length === 0 ? (
              <section className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <h2 className="text-lg font-bold">مفيش طلبات بالحالة دي</h2>
                <p className="mt-2 text-sm text-gray-500">اختار «الكل» لعرض كل طلبات الاسترجاع.</p>
                <Button variant="outline" className="mt-5 rounded-xl" onClick={() => setFilter('all')}>عرض الكل</Button>
              </section>
            ) : (
              <div className="space-y-4">
                {visibleRequests.map(request => (
                  <ReturnRequestDetails key={request.id} request={request} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ReturnRequests;
