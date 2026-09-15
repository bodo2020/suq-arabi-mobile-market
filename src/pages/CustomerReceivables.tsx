import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  CreditCard,
  FileText,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { getMyCustomerReceivables, type CustomerReceivableLedgerEntry } from '@/services/customerReceivables';

const money = (value: number | null | undefined) => `${Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
};

const entryLabel = (entry: CustomerReceivableLedgerEntry) => {
  if (entry.entry_type === 'charge') return 'فاتورة آجل';
  if (entry.entry_type === 'payment') return 'سداد مديونية';
  if (entry.entry_type === 'adjustment_increase') return 'تسوية بالزيادة';
  if (entry.entry_type === 'adjustment_decrease') return 'تسوية بالخصم';
  if (entry.entry_type === 'writeoff') return 'إقفال رصيد';
  return 'حركة على المديونية';
};

const CustomerReceivables = () => {
  const navigate = useNavigate();
  const { user, session, authLoading } = useUser();
  const receivables = useQuery({
    queryKey: ['my-customer-receivables-v2', user?.id],
    enabled: !!user?.id && !!session && !authLoading,
    queryFn: () => getMyCustomerReceivables(200),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const data = receivables.data;
  const activeCreditAccounts = useMemo(() => (data?.accounts || []).filter(row => row.credit_enabled && row.credit_limit > 0), [data?.accounts]);
  const hasCredit = activeCreditAccounts.length > 0;

  return (
    <MainLayout>
      <TopNavBar hideLogo hideSearch hideCart pageTitle="مديونيتي" showBackButton />
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-7" dir="rtl">
        {authLoading ? (
          <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل مديونيتك" /></div>
        ) : !user || !session ? (
          <section className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-primary"><WalletCards size={30} /></span>
            <h1 className="mt-4 text-2xl font-black">مديونيتك مرتبطة بحسابك</h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">سجّل دخولك بنفس الحساب المسجل في المعداوي عشان تشوف الرصيد والحركات بالتفصيل.</p>
            <Button className="mt-6 min-h-12 w-full rounded-xl" onClick={() => navigate('/phone-login')}>تسجيل الدخول</Button>
          </section>
        ) : receivables.isLoading ? (
          <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل الرصيد والحركات" /></div>
        ) : receivables.isError ? (
          <section role="alert" className="rounded-3xl border border-red-100 bg-white p-7 text-center shadow-sm">
            <h1 className="text-xl font-black">تعذر تحميل المديونية</h1>
            <p className="mt-2 text-sm text-gray-500">راجع اتصالك وحاول مرة تانية.</p>
            <Button className="mt-5 rounded-xl" onClick={() => void receivables.refetch()}>إعادة المحاولة</Button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl bg-[#005931] text-white shadow-[0_18px_50px_rgba(0,89,49,0.2)]">
              <div className="p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-100"><WalletCards size={18} />حساب الآجل</div>
                    <h1 className="mt-2 text-3xl font-black">{money(data?.total_balance)}</h1>
                    <p className="mt-1 text-sm text-emerald-100">إجمالي الرصيد المستحق حاليًا</p>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"><ReceiptText size={25} /></span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-emerald-100">الحد الائتماني المفعّل</p>
                    <strong className="mt-1 block text-xl font-black">{money(data?.total_credit_limit)}</strong>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-emerald-100">المتاح للشراء آجل</p>
                    <strong className="mt-1 block text-xl font-black">{money(data?.total_credit_available)}</strong>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-white/10 bg-black/5 p-3 text-xs leading-6 text-emerald-50">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                  <span>{hasCredit ? 'الأجل متاح فقط في الفروع اللي الإدارة فعّلت لك فيها حد ائتماني. كل عملية وسداد ظاهرين تحت بالتفصيل.' : 'لا يوجد حد آجل مفعّل حاليًا. لو عندك رصيد سابق سيظل ظاهرًا حتى يتم سداده بالكامل.'}</span>
                </div>
              </div>
            </section>

            {data?.accounts?.length ? (
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center gap-2"><Building2 size={20} className="text-primary" /><h2 className="text-lg font-black">الرصيد حسب الفرع</h2></div>
                <div className="space-y-3">
                  {data.accounts.map(account => (
                    <div key={account.branch_id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                      <div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{account.branch_name}</strong><p className="mt-1 text-xs text-gray-500">{account.credit_enabled ? 'الآجل مفعّل' : 'عمليات آجل جديدة غير مفعلة'}</p></div><strong className={account.balance > 0 ? 'text-red-700' : 'text-primary'}>{money(account.balance)}</strong></div>
                      {account.credit_enabled && <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white p-3"><span className="text-gray-500">الحد</span><strong className="mt-1 block">{money(account.credit_limit)}</strong></div><div className="rounded-xl bg-white p-3"><span className="text-gray-500">المتاح</span><strong className="mt-1 block text-primary">{money(account.credit_available)}</strong></div></div>}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div><h2 className="text-lg font-black">تفاصيل المديونية</h2><p className="mt-1 text-xs leading-5 text-gray-500">الفواتير الآجلة، السداد، المرتجعات والتسويات بترتيب زمني.</p></div>
                <FileText size={21} className="shrink-0 text-primary" />
              </div>

              {!data?.ledger?.length ? (
                <div className="rounded-2xl bg-gray-50 p-7 text-center"><WalletCards size={28} className="mx-auto text-gray-300" /><h3 className="mt-3 font-bold">مفيش حركات مديونية لسه</h3><p className="mt-1 text-sm text-gray-500">أي فاتورة آجل أو سداد جديد هيظهر هنا.</p></div>
              ) : (
                <div className="space-y-3">
                  {data.ledger.map(entry => {
                    const increase = Number(entry.signed_amount || 0) > 0;
                    const Icon = increase ? ArrowUpCircle : ArrowDownCircle;
                    return (
                      <article key={entry.id} className="rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${increase ? 'bg-red-50 text-red-700' : 'bg-green-50 text-primary'}`}><Icon size={20} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black">{entryLabel(entry)}</h3><p className="mt-0.5 text-xs text-gray-500">{entry.branch_name} · {formatDate(entry.created_at)}</p></div><strong className={increase ? 'text-red-700' : 'text-primary'}>{increase ? '+' : '-'}{money(Math.abs(entry.signed_amount))}</strong></div>
                            {entry.invoice_number && <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs"><div className="flex justify-between gap-2"><span className="text-gray-500">رقم الفاتورة</span><strong>{entry.invoice_number}</strong></div>{entry.invoice_total != null && <div className="mt-1 flex justify-between gap-2"><span className="text-gray-500">إجمالي الفاتورة</span><strong>{money(entry.invoice_total)}</strong></div>}{entry.paid_on_sale != null && <div className="mt-1 flex justify-between gap-2"><span className="text-gray-500">مدفوع وقت الشراء</span><strong>{money(entry.paid_on_sale)}</strong></div>}{entry.credit_amount != null && <div className="mt-1 flex justify-between gap-2"><span className="text-gray-500">المسجل آجل</span><strong className="text-amber-800">{money(entry.credit_amount)}</strong></div>}</div>}
                            {entry.payment_breakdown?.length ? <div className="mt-3 rounded-xl bg-green-50/60 p-3"><div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-primary"><CreditCard size={14} />طريقة السداد</div>{entry.payment_breakdown.map((part, index) => <div key={`${entry.id}-${index}`} className="flex justify-between gap-2 py-1 text-xs"><span>{part.name || part.code || 'وسيلة دفع'}</span><strong>{money(part.base_amount)}</strong></div>)}</div> : null}
                            {entry.description && <p className="mt-2 text-xs leading-5 text-gray-500">{entry.description}</p>}
                            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs"><span className="text-gray-500">الرصيد بعد الحركة</span><strong>{money(entry.balance_after)}</strong></div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CustomerReceivables;
