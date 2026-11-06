import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Banknote, Check, CheckCheck, ChevronDown, ChevronLeft, Copy, Gift, MapPin, Plus,
  ReceiptText, RefreshCw, ShieldCheck, ShoppingCart, Smartphone, StickyNote, Ticket, Truck, Wallet,
} from 'lucide-react';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import BrandLoader from '@/components/ui/BrandLoader';
import SubstitutionPreferenceCard from '@/components/checkout/SubstitutionPreferenceCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BrandBagIcon from '@/components/brand/BrandBagIcon';
import './payment.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { getMyLoyaltyVouchers, type LoyaltyVoucher } from '@/lib/loyalty';
import {
  checkoutError,
  checkoutLines,
  definitelyRejected,
  placeOrder,
  preparePendingCheckout,
  quoteOrder,
  reconcilePendingCheckoutAttempt,
  readPendingCheckout,
  removePendingCheckout,
  type PendingCheckout,
} from '@/lib/checkout';
import { DEFAULT_SUBSTITUTION_POLICY, type SubstitutionPolicy } from '@/lib/substitutionPolicy';

const WALLET_PHONE_NUMBER = '01005245096';
const money = (value: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

const Payment = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items, clearCart, isInitialized, syncError, isSaving } = useCart();
  const { toast } = useToast();
  const { user, authLoading } = useUser();
  const submitting = useRef(false);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [substitutionPolicy, setSubstitutionPolicy] = useState<SubstitutionPolicy>(DEFAULT_SUBSTITUTION_POLICY);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState('none');

  const lines = useMemo(() => checkoutLines(items), [items]);
  const serializedLines = useMemo(() => JSON.stringify(lines), [lines]);
  const orderReference = requestId.replace(/-/g, '').toUpperCase();

  useEffect(() => {
    if (!user?.id) {
      setPendingCheckout(null);
      setSelectedVoucherId('none');
      return;
    }
    try {
      const pending = readPendingCheckout(user.id);
      if (pending) {
        setPendingCheckout(pending);
        setRequestId(pending.requestId as `${string}-${string}-${string}-${string}-${string}`);
        setPaymentMethod(pending.paymentMethod);
        setNotes(pending.notes || '');
        setSubstitutionPolicy(pending.substitutionPolicy);
      }
    } catch {
      removePendingCheckout(user.id);
      setPendingCheckout(null);
      setRequestId(crypto.randomUUID());
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && isInitialized && !user) navigate('/phone-verify?returnTo=%2Fpayment', { replace: true });
  }, [authLoading, isInitialized, user, navigate]);

  const { data: customerData, isFetching: customerLoading, error: customerError } = useQuery({
    queryKey: ['customerData', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: customer, error: profileError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      const { data: address, error: addressError } = await supabase
        .from('customer_addresses')
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();
      if (addressError) throw addressError;
      return { ...customer, default_address: address };
    },
    enabled: !!user?.id,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

  const vouchersQuery = useQuery({
    queryKey: ['loyalty-vouchers', user?.id],
    queryFn: () => getMyLoyaltyVouchers(),
    enabled: !!user?.id,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

  const effectiveAddressId = pendingCheckout?.addressId || customerData?.default_address?.id || null;
  const quoteQuery = useQuery({
    queryKey: ['checkout-quote', user?.id, effectiveAddressId, serializedLines],
    queryFn: () => quoteOrder(lines, effectiveAddressId as string),
    enabled: !!user && !!effectiveAddressId && lines.length > 0 && !pendingCheckout && !authLoading && !customerLoading && !customerError,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const quote = quoteQuery.data;
  const grossTotal = Number(pendingCheckout?.total ?? quote?.total ?? 0);
  const displayedShipping = Number(quote?.shipping_cost ?? 0);
  const allVouchers = vouchersQuery.data || [];
  const activeVouchers = allVouchers.filter(voucher => voucher.status === 'active' && Number(voucher.remaining_value_egp) > 0);

  const selectedVoucher = useMemo<LoyaltyVoucher | null>(() => {
    if (pendingCheckout?.voucherCode) {
      return allVouchers.find(voucher => voucher.voucher_code === pendingCheckout.voucherCode || voucher.barcode_token === pendingCheckout.voucherCode) || null;
    }
    if (selectedVoucherId === 'none') return null;
    return allVouchers.find(voucher => voucher.id === selectedVoucherId) || null;
  }, [allVouchers, selectedVoucherId, pendingCheckout?.voucherCode]);

  useEffect(() => {
    if (!pendingCheckout?.voucherCode || !allVouchers.length) return;
    const saved = allVouchers.find(voucher => voucher.voucher_code === pendingCheckout.voucherCode || voucher.barcode_token === pendingCheckout.voucherCode);
    if (saved) setSelectedVoucherId(saved.id);
  }, [pendingCheckout?.voucherCode, allVouchers]);

  const voucherAmount = Number(
    pendingCheckout?.voucherAmount
      ?? (selectedVoucher ? Math.min(Number(selectedVoucher.remaining_value_egp || 0), grossTotal) : 0),
  );
  const payableTotal = Math.max(0, Number((grossTotal - voucherAmount).toFixed(2)));
  const hasSamePendingCart = !pendingCheckout || JSON.stringify(pendingCheckout.items) === serializedLines;

  const resetAttempt = () => {
    if (user?.id) removePendingCheckout(user.id);
    setPendingCheckout(null);
    setRequestId(crypto.randomUUID());
    void queryClient.invalidateQueries({ queryKey: ['loyalty-vouchers', user?.id] });
  };

  const handleSubmitOrder = async () => {
    if (submitting.current || authLoading || !isInitialized || isSaving) return;
    if (!user) {
      navigate('/phone-verify?returnTo=%2Fpayment');
      return;
    }
    if (customerLoading || customerError) {
      toast({ title: 'تعذر تحميل بيانات الحساب', description: 'انتظر التحميل أو أعد المحاولة.', variant: 'destructive' });
      return;
    }
    if (!customerData?.id || !customerData.name?.trim() || customerData.name.trim().length < 2) {
      navigate('/register?returnTo=%2Fpayment');
      return;
    }
    if (!customerData.default_address && !pendingCheckout?.addressId) {
      navigate('/addresses?returnTo=%2Fpayment');
      return;
    }
    if (syncError && !pendingCheckout) {
      toast({ title: 'شنطتك لم تُحفظ بعد', description: 'أعد محاولة حفظ الشنطة قبل تأكيد الطلب.', variant: 'destructive' });
      return;
    }
    if (!items.length && !pendingCheckout) {
      toast({ title: 'الشنطة فارغة', description: 'أضف منتجات إلى الشنطة أولاً.', variant: 'destructive' });
      return;
    }
    if (!pendingCheckout && (quoteQuery.isFetching || !quote)) {
      toast({
        title: 'لسه بنراجع الطلب',
        description: quoteQuery.error ? checkoutError(quoteQuery.error) : 'انتظر مراجعة السعر والمخزون ورسوم التوصيل.',
        variant: 'destructive',
      });
      return;
    }

    submitting.current = true;
    setIsLoading(true);
    let submittedAttempt: PendingCheckout | null = null;
    try {
      const candidate: PendingCheckout = {
        requestId,
        items: lines,
        addressId: customerData.default_address?.id || pendingCheckout?.addressId || '',
        paymentMethod,
        notes: notes.trim(),
        quoteToken: quote?.quote_token || pendingCheckout?.quoteToken || '',
        total: quote?.total ?? pendingCheckout?.total ?? 0,
        voucherCode: pendingCheckout?.voucherCode || selectedVoucher?.voucher_code || null,
        voucherAmount: pendingCheckout?.voucherAmount ?? voucherAmount,
        substitutionPolicy: pendingCheckout?.substitutionPolicy || substitutionPolicy,
      };

      const pending = await preparePendingCheckout(user.id, candidate);
      submittedAttempt = pending;
      setPendingCheckout(pending);
      setRequestId(pending.requestId as `${string}-${string}-${string}-${string}-${string}`);

      const placed = await placeOrder(pending);
      const cartMatchesPlacedAttempt = JSON.stringify(pending.items) === serializedLines;

      removePendingCheckout(user.id);
      setPendingCheckout(null);
      setWalletDialogOpen(false);
      setSelectedVoucherId('none');
      if (cartMatchesPlacedAttempt) clearCart();
      // Non-critical cache refresh must never turn a placed order into a failure toast.
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['loyalty-vouchers', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['loyalty-card', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['customer-loyalty-card', user.id] }),
      ]);

      navigate('/order-success', {
        state: {
          orderId: placed.id,
          orderNumber: placed.tracking_number,
          voucherAmount: placed.loyalty_voucher_amount || 0,
          amountDue: placed.amount_due ?? payableTotal,
        },
      });
    } catch (error) {
      console.error('Secure checkout error:', error);
      const rejected = definitelyRejected(error);
      const message = checkoutError(error);
      // Always reconcile the persisted request ID before deciding anything.
      // A "rejection" can come from the client-side re-quote in placeOrder,
      // which runs *before* the idempotent place RPC: if an earlier send of
      // this same attempt already committed (and took the last stock), the
      // re-quote fails although the order exists. Dropping the attempt then
      // would let the customer place a duplicate order.
      const attempt = submittedAttempt || pendingCheckout;
      let attemptState: 'placed' | 'absent' | 'unknown' = attempt ? 'unknown' : 'absent';
      if (attempt) {
        try {
          const resolved = await reconcilePendingCheckoutAttempt(attempt.requestId);
          if (resolved.exists && resolved.id) {
            attemptState = 'placed';
            removePendingCheckout(user.id);
            setPendingCheckout(null);
            setWalletDialogOpen(false);
            setSelectedVoucherId('none');
            if (JSON.stringify(attempt.items) === serializedLines) clearCart();
            void Promise.allSettled([
              queryClient.invalidateQueries({ queryKey: ['loyalty-vouchers', user.id] }),
              queryClient.invalidateQueries({ queryKey: ['loyalty-card', user.id] }),
              queryClient.invalidateQueries({ queryKey: ['customer-loyalty-card', user.id] }),
            ]);
            navigate('/order-success', {
              replace: true,
              state: {
                orderId: resolved.id,
                orderNumber: resolved.tracking_number || resolved.id,
                voucherAmount: Number(resolved.loyalty_voucher_amount || 0),
                amountDue: Number(resolved.amount_due ?? Math.max(0, Number(resolved.total || 0) - Number(resolved.loyalty_voucher_amount || 0))),
                recovered: true,
              },
            });
            return;
          }
          attemptState = 'absent';
        } catch (recoveryError) {
          console.warn('Checkout attempt reconciliation unavailable:', recoveryError);
        }
      }

      if (rejected && attemptState === 'absent') {
        resetAttempt();
        await Promise.all([quoteQuery.refetch(), vouchersQuery.refetch()]);
        toast({ title: 'راجع الطلب قبل التأكيد', description: message, variant: 'destructive' });
      } else {
        // The response may have been lost *after* the order committed, or we
        // could not confirm the attempt's state: keep the same request ID.
        // A negative/failed lookup is not proof that a delayed request cannot arrive.
        toast({
          title: 'لسه مش قادرين نتأكد من نتيجة الطلب',
          description: 'المحاولة محفوظة بنفس رقمها. راجع «طلباتي»، أو اضغط «تأكيد الطلب» تاني لاستكمال نفس المحاولة من غير تكرار.',
          variant: 'destructive',
        });
      }
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'phone' | 'order') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'phone') {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      } else {
        setCopiedOrderNumber(true);
        setTimeout(() => setCopiedOrderNumber(false), 2000);
      }
      toast({ title: 'تم النسخ', description: 'تم نسخ النص إلى الحافظة' });
    }).catch(() => toast({ title: 'خطأ', description: 'تعذر نسخ النص', variant: 'destructive' }));
  };

  if (authLoading || !isInitialized || !user) {
    return <CheckoutLayout step={2}><div className="flex justify-center py-20"><BrandLoader size="lg" /></div></CheckoutLayout>;
  }

  if (!items.length && !pendingCheckout) {
    return (
      <CheckoutLayout step={2}>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="mx-4 w-full max-w-md"><CardContent className="py-8 text-center">
            <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-bold">الشنطة فارغة</h2>
            <p className="mb-4 text-muted-foreground">لا توجد منتجات في شنطة التسوق</p>
            <Button onClick={() => navigate('/')}>تصفح المنتجات</Button>
          </CardContent></Card>
        </div>
      </CheckoutLayout>
    );
  }

  const quoteMessage = quoteQuery.error ? checkoutError(quoteQuery.error) : null;
  const submitBusy = isLoading || customerLoading || quoteQuery.isFetching || isSaving;
  const voucherLocked = !!pendingCheckout;
  const onConfirm = paymentMethod === 'wallet' && payableTotal > 0 ? () => {
    if (!pendingCheckout && (!quote || quoteMessage || syncError)) return;
    setWalletDialogOpen(true);
  } : handleSubmitOrder;
  const confirmLabel = isLoading ? 'بنأكّد طلبك…' : quoteQuery.isFetching ? 'بنراجع الأسعار…' : 'تأكيد الطلب';
  const address = customerData?.default_address;
  const addressArea = [address?.neighborhoods?.name, address?.areas?.name].filter(Boolean).join('، ');
  const itemCount = quote?.items?.length || lines.length;
  const showNotes = notesOpen || Boolean(notes);

  const confirmButton = (className = '') => (
    <button type="button" onClick={onConfirm} disabled={submitBusy} className={`pay-confirm ${className}`}>
      {submitBusy ? <span className="pay-confirm__spinner" aria-hidden="true" /> : <BrandBagIcon size={22} strokeWidth={2.4} accent="#FFC120" />}
      <span>{confirmLabel}</span>
      {!submitBusy && <ArrowLeft size={19} aria-hidden="true" className="pay-confirm__arrow" />}
    </button>
  );

  return (
    <CheckoutLayout step={2}>
      <div className="pay-heading">
        <h1>آخر خطوة!</h1>
        <p>راجع العنوان وطريقة الدفع، وطلبك هيتجهّز على طول.</p>
      </div>

      {pendingCheckout && (
        <div className="pay-pending" role="status">
          <RefreshCw size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">في محاولة طلب سابقة محفوظة بأمان.</p>
            <p className="mt-1 leading-6">الطلب وكوبون الخصم مقفولين على نفس المحاولة عشان مايتخصمش كوبون الخصم مرتين. {hasSamePendingCart ? '' : 'الشنطة الحالية اتغيّرت؛ مش هنمسحها بعد استكمال المحاولة السابقة.'}</p>
          </div>
        </div>
      )}

      <div className="pay-grid">
        <div className="pay-col">
          {/* 1. Delivery address */}
          <section className="pay-block pay-block--address">
            <header className="pay-block__head"><span className="pay-block__icon"><MapPin size={18} /></span><h2>هنوصّل فين؟</h2></header>
            {address ? (
              <div className="pay-address">
                <div className="min-w-0 flex-1">
                  <p className="pay-address__line">{address.address || 'عنوان محدد على الخريطة'}</p>
                  <p className="pay-address__meta">{addressArea ? `${addressArea} · ` : ''}العنوان الافتراضي</p>
                </div>
                {!pendingCheckout && <button type="button" className="pay-pill" onClick={() => navigate('/addresses?returnTo=%2Fpayment')}>تغيير</button>}
              </div>
            ) : pendingCheckout ? (
              <p className="text-sm text-amber-800">المحاولة السابقة مرتبطة بعنوان محفوظ. أكد نفس المحاولة لتحديد نتيجتها.</p>
            ) : (
              <button type="button" className="pay-empty-row" onClick={() => navigate('/addresses?returnTo=%2Fpayment')}>
                <Plus size={18} />أضف عنوان التوصيل
              </button>
            )}
            {pendingCheckout && address && <p className="mt-2 text-xs text-amber-700">العنوان مقفول مؤقتًا لحد ما نحدد نتيجة محاولة الطلب السابقة.</p>}
          </section>

          {/* 2. Payment method */}
          <section className="pay-block">
            <header className="pay-block__head"><span className="pay-block__icon"><Wallet size={18} /></span><h2>هتدفع إزاي؟</h2></header>
            {payableTotal <= 0 && grossTotal > 0 ? (
              <div className="pay-note"><Gift size={18} /><span><strong>مش مطلوب دفع.</strong> كوبون الخصم مغطّي الطلب كله.</span></div>
            ) : (
              <div className="pay-methods" role="radiogroup" aria-label="طريقة الدفع">
                {([
                  { value: 'cash', icon: Banknote, title: 'كاش عند الاستلام', sub: 'ادفع للمندوب لما طلبك يوصل' },
                  { value: 'wallet', icon: Smartphone, title: 'محفظة إلكترونية', sub: 'فودافون كاش أو إنستا باي' },
                ] as const).map(option => {
                  const Icon = option.icon;
                  const selected = paymentMethod === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={voucherLocked}
                      onClick={() => setPaymentMethod(option.value)}
                      className={`pay-method ${selected ? 'is-selected' : ''}`}
                    >
                      <span className="pay-method__tick" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
                      <span className="pay-method__icon"><Icon size={22} /></span>
                      <strong>{option.title}</strong>
                      <small>{option.sub}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. Voucher */}
          <section className="pay-block">
            <header className="pay-block__head">
              <span className="pay-block__icon pay-block__icon--gold"><Ticket size={18} /></span>
              <h2>كوبون خصم</h2>
              {!voucherLocked && activeVouchers.length > 0 && <span className="pay-count">{activeVouchers.length.toLocaleString('ar-EG')} متاح</span>}
            </header>
            {voucherLocked ? (
              pendingCheckout?.voucherCode ? (
                <div className="pay-ticket is-selected is-static">
                  <span className="pay-ticket__amount">- {money(Number(pendingCheckout.voucherAmount || 0))} <small>ج.م</small></span>
                  <span dir="ltr" className="pay-ticket__code">{pendingCheckout.voucherCode}</span>
                  <span className="pay-ticket__meta">مقفول على المحاولة الحالية</span>
                </div>
              ) : <p className="pay-muted">المحاولة الحالية اتبدأت بدون كوبون خصم.</p>
            ) : vouchersQuery.isLoading ? (
              <div className="flex gap-2"><span className="pay-ticket-skeleton" /><span className="pay-ticket-skeleton" /></div>
            ) : activeVouchers.length === 0 ? (
              <button type="button" className="pay-empty-row" onClick={() => navigate('/vouchers')}>
                <Gift size={18} className="text-[#cf9700]" />
                <span className="flex-1 text-right">مفيش كوبونات دلوقتي · <b>حوّل نقاطك لكوبون</b></span>
                <ChevronLeft size={18} />
              </button>
            ) : (
              <div className="pay-tickets hide-scrollbar">
                <button type="button" onClick={() => setSelectedVoucherId('none')} className={`pay-ticket pay-ticket--none ${selectedVoucherId === 'none' ? 'is-selected' : ''}`}>
                  <span className="pay-ticket__amount">بدون</span>
                  <span className="pay-ticket__meta">مش هستخدم كوبون</span>
                </button>
                {activeVouchers.map(voucher => {
                  const balance = Number(voucher.remaining_value_egp || 0);
                  const applied = grossTotal > 0 ? Math.min(balance, grossTotal) : balance;
                  const selected = selectedVoucherId === voucher.id;
                  return (
                    <button key={voucher.id} type="button" onClick={() => setSelectedVoucherId(voucher.id)} className={`pay-ticket ${selected ? 'is-selected' : ''}`}>
                      {selected && <span className="pay-ticket__tick" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
                      <span className="pay-ticket__amount">- {money(applied)} <small>ج.م</small></span>
                      <span dir="ltr" className="pay-ticket__code">{voucher.voucher_code}</span>
                      <span className="pay-ticket__meta">رصيده {money(balance)} ج.م</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Substitutions */}
          <SubstitutionPreferenceCard
            value={pendingCheckout?.substitutionPolicy || substitutionPolicy}
            onChange={setSubstitutionPolicy}
            disabled={!!pendingCheckout}
          />

          {/* 5. Notes (collapsed until needed) */}
          <section className="pay-block">
            {pendingCheckout ? (
              <>
                <header className="pay-block__head"><span className="pay-block__icon"><StickyNote size={18} /></span><h2>ملاحظة للطلب</h2></header>
                <p className="pay-muted">{pendingCheckout.notes || 'بدون ملاحظات'}</p>
              </>
            ) : showNotes ? (
              <>
                <header className="pay-block__head"><span className="pay-block__icon"><StickyNote size={18} /></span><h2>ملاحظة للطلب</h2><span className="pay-count">اختياري</span></header>
                <textarea
                  className="pay-textarea"
                  rows={3}
                  value={notes}
                  autoFocus={notesOpen && !notes}
                  onChange={event => setNotes(event.target.value)}
                  placeholder="مثلًا: رن الجرس مرتين، أو العمارة جنب الصيدلية…"
                />
              </>
            ) : (
              <button type="button" className="pay-add-note" onClick={() => setNotesOpen(true)}>
                <span className="pay-block__icon"><StickyNote size={18} /></span>
                <span className="flex-1 text-right"><strong>أضف ملاحظة للطلب</strong><small>علامة مميزة، ميعاد، أو أي طلب خاص</small></span>
                <Plus size={18} />
              </button>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside className="pay-summary">
          <header className="pay-block__head">
            <span className="pay-block__icon"><ReceiptText size={18} /></span>
            <h2>ملخص الطلب</h2>
            <span className="pay-count">{itemCount.toLocaleString('ar-EG')} {itemCount === 1 ? 'صنف' : 'أصناف'}</span>
          </header>

          {!pendingCheckout && quote?.items?.length ? (
            <details className="pay-items">
              <summary>عرض المنتجات<ChevronDown size={16} /></summary>
              <ul>
                {quote.items.map(item => (
                  <li key={`${item.product_id}-${item.is_bulk ? 'bulk' : 'regular'}`}>
                    <span className="min-w-0 flex-1"><b>{item.name}</b><small>{item.unit_of_measure === 'weight' ? `${item.quantity} كجم` : item.is_bulk ? `${item.quantity} عبوة × ${item.bulk_quantity || 1} قطعة` : `${item.quantity} قطعة`}</small></span>
                    <span className="whitespace-nowrap font-bold">{money(item.total)} ج.م</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="pay-muted">{pendingCheckout ? 'جارٍ استكمال المحاولة المحفوظة.' : quoteQuery.isFetching ? 'بنراجع الأسعار والمخزون…' : 'الملخص النهائي هيظهر بعد مراجعة الأسعار.'}</p>
          )}

          <dl className="pay-rows">
            {quote && !pendingCheckout && <>
              <div><dt>قيمة المنتجات</dt><dd>{money(quote.subtotal)} ج.م</dd></div>
              <div><dt><Truck size={15} />التوصيل</dt><dd>{quote.free_delivery ? <span className="pay-free">مجاني</span> : `${money(displayedShipping)} ج.م`}</dd></div>
            </>}
            {voucherAmount > 0 && <div className="pay-rows__voucher"><dt><Ticket size={15} />كوبون الخصم</dt><dd>- {money(voucherAmount)} ج.م</dd></div>}
          </dl>
          <div className="pay-total">
            <span>المطلوب دفعه</span>
            <strong>{grossTotal > 0 ? <>{money(payableTotal)} <small>ج.م</small></> : '—'}</strong>
          </div>

          {(customerError || (!pendingCheckout && syncError) || quoteMessage) && (
            <div role="alert" className="pay-error">
              {(!pendingCheckout && syncError) || (customerError ? 'تعذر تحميل بيانات الحساب.' : quoteMessage)}
              {quoteMessage && !pendingCheckout && <button type="button" className="pay-pill mt-3 w-full" onClick={() => void quoteQuery.refetch()}>إعادة المراجعة</button>}
            </div>
          )}

          {confirmButton('pay-confirm--desktop')}
          <p className="pay-secure"><ShieldCheck size={15} />الأسعار والمخزون بيتأكدوا تاني لحظة تأكيد الطلب.</p>
        </aside>
      </div>

      {/* Mobile: total + confirm always in reach */}
      <div className="pay-bar">
        <div className="pay-bar__total">
          <span>{paymentMethod === 'wallet' && payableTotal > 0 ? 'هتحوّل' : 'هتدفع'}</span>
          <strong>{grossTotal > 0 ? <>{money(payableTotal)} <small>ج.م</small></> : '—'}</strong>
        </div>
        {confirmButton()}
      </div>

      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="mx-auto max-w-md">
          <DialogHeader><DialogTitle className="text-center">تحويل المبلغ عبر المحفظة الإلكترونية</DialogTitle><DialogDescription className="text-center">القيمة دي بعد خصم كوبون الخصم. استخدم مرجع الطلب مع التحويل.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#fffaeb] p-4 text-center ring-1 ring-[#f1d78a]"><p className="mb-1 text-sm">المبلغ المطلوب</p><p className="text-2xl font-black text-[#005931]">{money(payableTotal)} ج.م</p>{voucherAmount > 0 && <p className="mt-1 text-xs text-emerald-700">تم خصم {money(voucherAmount)} ج.م بكوبون الخصم</p>}</div>
            <div className="space-y-2"><p className="text-sm">حوّل المبلغ عبر فودافون كاش أو انستا باي إلى:</p><div className="flex items-center justify-between rounded-xl bg-muted p-3"><span className="font-mono text-lg font-bold">{WALLET_PHONE_NUMBER}</span><Button variant="ghost" size="sm" onClick={() => copyToClipboard(WALLET_PHONE_NUMBER, 'phone')} className="h-8 w-8 p-0">{copiedPhone ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div></div>
            <div className="space-y-2"><p className="text-sm">مرجع الطلب:</p><div className="flex items-center justify-between gap-2 rounded-xl bg-muted p-3"><span className="min-w-0 break-all font-mono text-xs font-medium">{orderReference}</span><Button variant="ghost" size="sm" onClick={() => copyToClipboard(orderReference, 'order')} className="h-8 w-8 shrink-0 p-0">{copiedOrderNumber ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div></div>
            <button type="button" onClick={handleSubmitOrder} className="pay-confirm" disabled={isLoading}>{isLoading ? 'جاري تأكيد الطلب...' : 'حوّلت، أكّد الطلب'}</button>
          </div>
        </DialogContent>
      </Dialog>
    </CheckoutLayout>
  );
};

export default Payment;
