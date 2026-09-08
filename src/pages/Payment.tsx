import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCheck,
  Copy,
  CreditCard,
  DollarSign,
  Gift,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Wallet,
} from 'lucide-react';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import BrandLoader from '@/components/ui/BrandLoader';
import SwipeButton from '@/components/ui/SwipeButton';
import AddressDisplay from '@/components/ui/AddressDisplay';
import OrderNotes from '@/components/ui/OrderNotes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  readPendingCheckout,
  removePendingCheckout,
  type PendingCheckout,
} from '@/lib/checkout';

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
        setRequestId(pending.requestId);
        setPaymentMethod(pending.paymentMethod);
        setNotes(pending.notes || '');
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
      toast({ title: 'سلتك لم تُحفظ بعد', description: 'أعد محاولة حفظ السلة قبل تأكيد الطلب.', variant: 'destructive' });
      return;
    }
    if (!items.length && !pendingCheckout) {
      toast({ title: 'السلة فارغة', description: 'أضف منتجات إلى السلة أولاً.', variant: 'destructive' });
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
      };

      const pending = await preparePendingCheckout(user.id, candidate);
      setPendingCheckout(pending);
      setRequestId(pending.requestId);

      const placed = await placeOrder(pending);
      const cartMatchesPlacedAttempt = JSON.stringify(pending.items) === serializedLines;

      removePendingCheckout(user.id);
      setPendingCheckout(null);
      setWalletDialogOpen(false);
      setSelectedVoucherId('none');
      if (cartMatchesPlacedAttempt) clearCart();
      await Promise.all([
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
      if (rejected) {
        resetAttempt();
        await Promise.all([quoteQuery.refetch(), vouchersQuery.refetch()]);
        toast({ title: 'راجع الطلب قبل التأكيد', description: message, variant: 'destructive' });
      } else {
        toast({
          title: 'تعذر التأكد من نتيجة الطلب',
          description: `${message} اضغط تأكيد مرة تانية؛ هنكمل نفس المحاولة بدون إنشاء طلب مكرر.`,
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
            <h2 className="mb-2 text-xl font-bold">السلة فارغة</h2>
            <p className="mb-4 text-muted-foreground">لا توجد منتجات في سلة التسوق</p>
            <Button onClick={() => navigate('/')}>تصفح المنتجات</Button>
          </CardContent></Card>
        </div>
      </CheckoutLayout>
    );
  }

  const quoteMessage = quoteQuery.error ? checkoutError(quoteQuery.error) : null;
  const submitBusy = isLoading || customerLoading || quoteQuery.isFetching || isSaving;
  const voucherLocked = !!pendingCheckout;

  return (
    <CheckoutLayout step={2}>
      <h1 className="checkout-title">آخر خطوة، وطلبك عندنا.</h1>
      <p className="checkout-intro">السعر والتوصيل والتوفر والفاوچر بيتراجعوا من السيرفر قبل إنشاء الطلب.</p>

      {pendingCheckout && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2"><RefreshCw size={18} className="mt-0.5 shrink-0" /><div>
            <p className="font-bold">في محاولة طلب سابقة محفوظة بأمان.</p>
            <p className="mt-1 leading-6">الطلب والفاوچر مقفولين على نفس المحاولة عشان مايتخصمش الفاوچر مرتين. {hasSamePendingCart ? '' : 'السلة الحالية اتغيّرت؛ مش هنمسحها بعد استكمال المحاولة السابقة.'}</p>
          </div></div>
        </div>
      )}

      <div className="checkout-payment">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />عنوان التوصيل</CardTitle></CardHeader>
              <CardContent>
                {customerData?.default_address ? (
                  <div className="space-y-2">
                    <AddressDisplay
                      address={customerData.default_address.address || ''}
                      areaName={customerData.default_address.areas?.name || undefined}
                      neighborhoodName={customerData.default_address.neighborhoods?.name || undefined}
                      onEdit={() => pendingCheckout ? undefined : navigate('/addresses?returnTo=%2Fpayment')}
                    />
                    <div className="flex items-center gap-1 text-xs text-gray-500"><div className="h-2 w-2 rounded-full bg-primary" />العنوان الافتراضي للتوصيل</div>
                    {pendingCheckout && <p className="text-xs text-amber-700">العنوان مقفول مؤقتًا لحد ما نحدد نتيجة محاولة الطلب السابقة.</p>}
                  </div>
                ) : pendingCheckout ? (
                  <p className="text-sm text-amber-800">المحاولة السابقة مرتبطة بعنوان محفوظ. أكد نفس المحاولة لتحديد نتيجتها.</p>
                ) : (
                  <div className="py-6 text-center"><p className="mb-4 text-muted-foreground">لا يوجد عنوان للتوصيل</p><Button variant="outline" onClick={() => navigate('/addresses?returnTo=%2Fpayment')}>إضافة عنوان جديد</Button></div>
                )}
              </CardContent>
            </Card>

            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-primary" />استخدم فاوچر</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {voucherLocked ? (
                  pendingCheckout?.voucherCode ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-emerald-700">فاوچر المحاولة الحالية</p><p dir="ltr" className="mt-1 text-right font-mono font-bold">{pendingCheckout.voucherCode}</p></div><Badge>مقفول للمحاولة</Badge></div>
                      <div className="mt-3 text-sm">هيتخصم <strong className="text-primary">{money(Number(pendingCheckout.voucherAmount || 0))} ج.م</strong></div>
                    </div>
                  ) : <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">المحاولة الحالية اتبدأت بدون فاوچر.</p>
                ) : vouchersQuery.isLoading ? (
                  <div className="flex justify-center py-6"><BrandLoader size="sm" /></div>
                ) : activeVouchers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-5 text-center">
                    <Gift className="mx-auto mb-2 text-gray-300" size={30} />
                    <p className="font-semibold">مفيش فاوچر متاح حاليًا</p>
                    <p className="mt-1 text-xs text-gray-500">حوّل نقاطك إلى فاوچر الأول.</p>
                    <Button variant="outline" className="mt-3" onClick={() => navigate('/vouchers')}>قسائمي وتحويل النقاط</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button type="button" onClick={() => setSelectedVoucherId('none')} className={`w-full rounded-2xl border p-4 text-right transition ${selectedVoucherId === 'none' ? 'border-primary bg-green-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center justify-between"><span className="font-semibold">بدون فاوچر</span>{selectedVoucherId === 'none' && <Badge>مختار</Badge>}</div>
                    </button>
                    {activeVouchers.map(voucher => {
                      const applied = Math.min(Number(voucher.remaining_value_egp || 0), grossTotal);
                      const selected = selectedVoucherId === voucher.id;
                      return (
                        <button key={voucher.id} type="button" onClick={() => setSelectedVoucherId(voucher.id)} className={`w-full rounded-2xl border p-4 text-right transition ${selected ? 'border-primary bg-green-50 shadow-sm' : 'hover:border-emerald-200 hover:bg-gray-50'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div><p dir="ltr" className="text-right font-mono text-sm font-bold">{voucher.voucher_code}</p><p className="mt-1 text-xs text-gray-500">رصيده {money(voucher.remaining_value_egp)} ج.م</p></div>
                            <div className="text-left"><div className="font-black text-primary">- {money(applied)} ج.م</div>{selected && <Badge className="mt-1">مختار</Badge>}</div>
                          </div>
                        </button>
                      );
                    })}
                    <Button variant="ghost" className="w-full" onClick={() => navigate('/vouchers')}>إدارة كل الفاوچرات</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />طريقة الدفع</CardTitle></CardHeader>
              <CardContent>
                {payableTotal <= 0 ? (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900"><strong>مش مطلوب دفع إضافي.</strong><p className="mt-1 text-xs">الفاوچر يغطي كامل الطلب.</p></div>
                ) : (
                  <RadioGroup value={paymentMethod} onValueChange={value => setPaymentMethod(value as 'cash' | 'wallet')} className="space-y-4" disabled={voucherLocked}>
                    <div className="flex items-start space-x-3 space-x-reverse rounded-lg border p-4 transition-colors hover:bg-accent/50">
                      <RadioGroupItem value="cash" id="cash" className="mt-1" /><div className="flex-1"><Label htmlFor="cash" className="flex cursor-pointer items-center gap-2 font-medium"><DollarSign className="h-4 w-4" />الدفع عند الاستلام</Label><p className="mt-1 text-sm text-muted-foreground">ادفع {money(payableTotal)} ج.م عند وصول طلبك</p></div>
                    </div>
                    <div className="flex items-start space-x-3 space-x-reverse rounded-lg border p-4 transition-colors hover:bg-accent/50">
                      <RadioGroupItem value="wallet" id="wallet" className="mt-1" /><div className="flex-1"><Label htmlFor="wallet" className="flex cursor-pointer items-center gap-2 font-medium"><Wallet className="h-4 w-4" />المحفظة الإلكترونية</Label><p className="mt-1 text-sm text-muted-foreground">حوّل {money(payableTotal)} ج.م فقط بعد خصم الفاوچر</p></div>
                    </div>
                  </RadioGroup>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>ملاحظة للطلب <span className="text-sm font-normal text-muted-foreground">(اختياري)</span></CardTitle></CardHeader>
              <CardContent>{pendingCheckout ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">{pendingCheckout.notes || 'بدون ملاحظات'}</p> : <OrderNotes value={notes} onChange={setNotes} />}</CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />ملخص الطلب</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>مرجع الطلب:</span><Badge variant="secondary" className="max-w-full break-all">{orderReference}</Badge></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs text-green-800"><ShieldCheck size={18} className="shrink-0" /><span>الأسعار والمخزون والفاوچر بيتأكدوا من السيرفر وقت إنشاء الطلب.</span></div>

                <div className="space-y-3">
                  {!pendingCheckout && quote?.items?.length ? quote.items.map(item => (
                    <div key={`${item.product_id}-${item.is_bulk ? 'bulk' : 'regular'}`} className="flex justify-between gap-3 py-2">
                      <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.unit_of_measure === 'weight' ? `${item.quantity} كجم` : item.is_bulk ? `${item.quantity} عبوة × ${item.bulk_quantity || 1} قطعة` : `${item.quantity} قطعة`}</p></div>
                      <span className="whitespace-nowrap font-medium">{money(item.total)} ج.م</span>
                    </div>
                  )) : <div className="py-5 text-center text-sm text-muted-foreground">{pendingCheckout ? 'جارٍ استكمال المحاولة المحفوظة.' : quoteQuery.isFetching ? 'بنراجع الأسعار والمخزون…' : 'الملخص النهائي هيظهر بعد مراجعة السيرفر.'}</div>}
                </div>

                <Separator />
                {quote && !pendingCheckout && <div className="space-y-2"><div className="flex justify-between"><span>قيمة المنتجات</span><span className="font-bold">{money(quote.subtotal)} ج.م</span></div><div className="flex justify-between"><span>التوصيل</span><span className="font-bold">{quote.free_delivery ? <span className="text-green-600">مجاناً</span> : `${money(displayedShipping)} ج.م`}</span></div></div>}
                <div className="flex justify-between text-sm"><span>إجمالي الطلب</span><span className="font-bold">{grossTotal > 0 ? `${money(grossTotal)} ج.م` : '—'}</span></div>
                {voucherAmount > 0 && <div className="flex justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><span>فاوچر</span><strong>- {money(voucherAmount)} ج.م</strong></div>}
                <Separator />
                <div className="flex justify-between text-lg font-bold"><span>المطلوب دفعه</span><span className="text-primary">{grossTotal > 0 ? `${money(payableTotal)} ج.م` : '—'}</span></div>

                {(customerError || (!pendingCheckout && syncError) || quoteMessage) && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{(!pendingCheckout && syncError) || (customerError ? 'تعذر تحميل بيانات الحساب.' : quoteMessage)}{quoteMessage && !pendingCheckout && <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => void quoteQuery.refetch()}>إعادة المراجعة</Button>}</div>}

                <div className="pt-2">
                  <SwipeButton
                    completeText="تأكيد الطلب"
                    onComplete={paymentMethod === 'wallet' && payableTotal > 0 ? () => {
                      if (!pendingCheckout && (!quote || quoteMessage || syncError)) return;
                      setWalletDialogOpen(true);
                    } : handleSubmitOrder}
                    isLoading={submitBusy}
                    className="checkout-submit w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="mx-auto max-w-md">
          <DialogHeader><DialogTitle className="text-center">تحويل المبلغ عبر المحفظة الإلكترونية</DialogTitle><DialogDescription className="text-center">القيمة دي بعد خصم الفاوچر. استخدم مرجع الطلب مع التحويل.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Card><CardContent className="p-4 text-center"><p className="mb-2">المبلغ المطلوب:</p><p className="text-2xl font-bold text-primary">{money(payableTotal)} ج.م</p>{voucherAmount > 0 && <p className="mt-1 text-xs text-emerald-700">تم خصم {money(voucherAmount)} ج.م بالفاوچر</p>}</CardContent></Card>
            <div className="space-y-3"><p className="text-sm">حوّل المبلغ عبر فودافون كاش أو انستا باي إلى:</p><div className="flex items-center justify-between rounded-lg bg-muted p-3"><span className="font-mono text-lg font-bold">{WALLET_PHONE_NUMBER}</span><Button variant="ghost" size="sm" onClick={() => copyToClipboard(WALLET_PHONE_NUMBER, 'phone')} className="h-8 w-8 p-0">{copiedPhone ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div></div>
            <div className="space-y-3"><p className="text-sm">مرجع الطلب:</p><div className="flex items-center justify-between gap-2 rounded-lg bg-muted p-3"><span className="min-w-0 break-all font-mono text-xs font-medium">{orderReference}</span><Button variant="ghost" size="sm" onClick={() => copyToClipboard(orderReference, 'order')} className="h-8 w-8 shrink-0 p-0">{copiedOrderNumber ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div></div>
            <Button onClick={handleSubmitOrder} className="w-full" disabled={isLoading}>{isLoading ? 'جاري تأكيد الطلب...' : 'تأكيد الطلب'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </CheckoutLayout>
  );
};

export default Payment;
