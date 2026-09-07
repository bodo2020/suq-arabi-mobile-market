import React, { useEffect, useMemo, useRef, useState } from 'react';
import BrandLoader from '@/components/ui/BrandLoader';
import { useNavigate } from 'react-router-dom';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { Copy, CheckCheck, MapPin, CreditCard, ShoppingCart, Wallet, DollarSign, ShieldCheck, RefreshCw } from 'lucide-react';
import SwipeButton from '@/components/ui/SwipeButton';
import AddressDisplay from '@/components/ui/AddressDisplay';
import OrderNotes from '@/components/ui/OrderNotes';
import { useQuery } from '@tanstack/react-query';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
const money = (value: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const Payment = () => {
  const navigate = useNavigate();
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

  const lines = useMemo(() => checkoutLines(items), [items]);
  const serializedLines = useMemo(() => JSON.stringify(lines), [lines]);
  const orderReference = requestId.replace(/-/g, '').toUpperCase();

  useEffect(() => {
    if (!user?.id) {
      setPendingCheckout(null);
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

  const effectiveAddressId = pendingCheckout?.addressId || customerData?.default_address?.id || null;

  const quoteQuery = useQuery({
    queryKey: ['checkout-quote', user?.id, effectiveAddressId, serializedLines],
    queryFn: () => quoteOrder(lines, effectiveAddressId as string),
    enabled: !!user && !!effectiveAddressId && lines.length > 0 && !authLoading && !customerLoading && !customerError,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const quote = quoteQuery.data;
  const displayedTotal = pendingCheckout?.total ?? quote?.total ?? 0;
  const displayedShipping = quote?.shipping_cost ?? 0;
  const hasSamePendingCart = !pendingCheckout || JSON.stringify(pendingCheckout.items) === serializedLines;

  const resetAttempt = () => {
    if (user?.id) removePendingCheckout(user.id);
    setPendingCheckout(null);
    setRequestId(crypto.randomUUID());
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
    if (syncError) {
      toast({ title: 'سلتك لم تُحفظ بعد', description: 'أعد محاولة حفظ السلة قبل تأكيد الطلب.', variant: 'destructive' });
      return;
    }
    if (!items.length) {
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
      };

      const pending = await preparePendingCheckout(user.id, candidate);
      setPendingCheckout(pending);
      setRequestId(pending.requestId);

      const placed = await placeOrder(pending);
      const cartMatchesPlacedAttempt = JSON.stringify(pending.items) === serializedLines;

      removePendingCheckout(user.id);
      setPendingCheckout(null);
      setWalletDialogOpen(false);
      if (cartMatchesPlacedAttempt) clearCart();

      navigate('/order-success', {
        state: {
          orderId: placed.id,
          orderNumber: placed.tracking_number,
        },
      });
    } catch (error) {
      console.error('Secure checkout error:', error);
      const rejected = definitelyRejected(error);
      const message = checkoutError(error);

      if (rejected) {
        resetAttempt();
        await quoteQuery.refetch();
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
    }).catch(() => {
      toast({ title: 'خطأ', description: 'تعذر نسخ النص', variant: 'destructive' });
    });
  };

  if (authLoading || !isInitialized) {
    return <CheckoutLayout step={2}><div className="flex justify-center py-20"><BrandLoader size="lg" /></div></CheckoutLayout>;
  }

  if (!user) {
    navigate('/phone-verify?returnTo=%2Fpayment');
    return <CheckoutLayout step={2}><div className="flex justify-center py-20"><BrandLoader size="lg" /></div></CheckoutLayout>;
  }

  if (!items.length && !pendingCheckout) {
    return (
      <CheckoutLayout step={2}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">السلة فارغة</h2>
              <p className="text-muted-foreground mb-4">لا توجد منتجات في سلة التسوق</p>
              <Button onClick={() => navigate('/')}>تصفح المنتجات</Button>
            </CardContent>
          </Card>
        </div>
      </CheckoutLayout>
    );
  }

  const quoteMessage = quoteQuery.error ? checkoutError(quoteQuery.error) : null;
  const submitBusy = isLoading || customerLoading || quoteQuery.isFetching || isSaving;

  return (
    <CheckoutLayout step={2}>
      <h1 className="checkout-title">آخر خطوة، وطلبك عندنا.</h1>
      <p className="checkout-intro">السعر والتوصيل والتوفر بيتراجعوا من السيرفر على فرع عنوانك قبل إنشاء الطلب.</p>

      {pendingCheckout && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <RefreshCw size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">في محاولة طلب سابقة محفوظة بأمان.</p>
              <p className="mt-1 leading-6">الضغط على تأكيد هيكمل نفس المحاولة بدل إنشاء طلب جديد. {hasSamePendingCart ? '' : 'السلة الحالية اتغيّرت؛ مش هنمسحها بعد استكمال المحاولة السابقة.'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="checkout-payment">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />عنوان التوصيل</CardTitle>
              </CardHeader>
              <CardContent>
                {customerData?.default_address ? (
                  <div className="space-y-2">
                    <AddressDisplay
                      address={customerData.default_address.address || ''}
                      areaName={customerData.default_address.areas?.name || undefined}
                      neighborhoodName={customerData.default_address.neighborhoods?.name || undefined}
                      onEdit={() => pendingCheckout ? undefined : navigate('/addresses?returnTo=%2Fpayment')}
                    />
                    <div className="text-xs text-gray-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" />العنوان الافتراضي للتوصيل</div>
                    {pendingCheckout && <p className="text-xs text-amber-700">العنوان مقفول مؤقتًا لحد ما نحدد نتيجة محاولة الطلب السابقة.</p>}
                  </div>
                ) : pendingCheckout ? (
                  <p className="text-sm text-amber-800">المحاولة السابقة مرتبطة بعنوان محفوظ. أكد نفس المحاولة لتحديد نتيجتها.</p>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">لا يوجد عنوان للتوصيل</p>
                    <Button variant="outline" onClick={() => navigate('/addresses?returnTo=%2Fpayment')}>إضافة عنوان جديد</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />طريقة الدفع</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={value => setPaymentMethod(value as 'cash' | 'wallet')} className="space-y-4" disabled={!!pendingCheckout}>
                  <div className="flex items-start space-x-3 space-x-reverse p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="cash" id="cash" className="mt-1" />
                    <div className="flex-1"><Label htmlFor="cash" className="font-medium cursor-pointer flex items-center gap-2"><DollarSign className="w-4 h-4" />الدفع عند الاستلام</Label><p className="text-sm text-muted-foreground mt-1">ادفع نقداً عند وصول طلبك</p></div>
                  </div>
                  <div className="flex items-start space-x-3 space-x-reverse p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="wallet" id="wallet" className="mt-1" />
                    <div className="flex-1"><Label htmlFor="wallet" className="font-medium cursor-pointer flex items-center gap-2"><Wallet className="w-4 h-4" />المحفظة الإلكترونية</Label><p className="text-sm text-muted-foreground mt-1">فودافون كاش أو انستا باي</p></div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>ملاحظة للطلب <span className="text-sm font-normal text-muted-foreground">(اختياري)</span></CardTitle></CardHeader>
              <CardContent>
                {pendingCheckout ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">{pendingCheckout.notes || 'بدون ملاحظات'}</p> : <OrderNotes value={notes} onChange={setNotes} />}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" />ملخص الطلب</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>مرجع الطلب:</span><Badge variant="secondary" className="max-w-full break-all">{orderReference}</Badge></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs text-green-800">
                  <ShieldCheck size={18} className="shrink-0" />
                  <span>الأسعار والمخزون ورسوم التوصيل في الملخص معتمدة من السيرفر.</span>
                </div>

                <div className="space-y-3">
                  {quote?.items?.length ? quote.items.map(item => (
                    <div key={`${item.product_id}-${item.is_bulk ? 'bulk' : 'regular'}`} className="flex justify-between gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.unit_of_measure === 'weight' ? `${item.quantity} كجم` : item.is_bulk ? `${item.quantity} عبوة × ${item.bulk_quantity || 1} قطعة` : `${item.quantity} قطعة`}</p>
                      </div>
                      <span className="font-medium whitespace-nowrap">{money(item.total)} ج.م</span>
                    </div>
                  )) : (
                    <div className="py-5 text-center text-sm text-muted-foreground">{quoteQuery.isFetching ? 'بنراجع الأسعار والمخزون…' : pendingCheckout ? 'جارٍ استكمال المحاولة المحفوظة.' : 'الملخص النهائي هيظهر بعد مراجعة السيرفر.'}</div>
                  )}
                </div>

                <Separator />

                {quote && !pendingCheckout && (
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>قيمة المنتجات</span><span className="font-bold">{money(quote.subtotal)} ج.م</span></div>
                    <div className="flex justify-between"><span>التوصيل</span><span className="font-bold">{quote.free_delivery ? <span className="text-green-600">مجاناً</span> : `${money(displayedShipping)} ج.م`}</span></div>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-lg font-bold"><span>الإجمالي النهائي</span><span className="text-primary">{displayedTotal > 0 ? `${money(displayedTotal)} ج.م` : '—'}</span></div>

                {(customerError || syncError || quoteMessage) && (
                  <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {syncError || (customerError ? 'تعذر تحميل بيانات الحساب.' : quoteMessage)}
                    {quoteMessage && !pendingCheckout && <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => void quoteQuery.refetch()}>إعادة المراجعة</Button>}
                  </div>
                )}

                {!pendingCheckout && customerData?.default_address && quoteMessage === 'التوصيل غير متاح لهذا العنوان حاليًا.' && (
                  <Button variant="outline" className="w-full" onClick={() => navigate('/addresses?returnTo=%2Fpayment')}>تغيير العنوان</Button>
                )}

                <div className="pt-2">
                  <SwipeButton
                    completeText="تأكيد الطلب"
                    onComplete={paymentMethod === 'wallet' ? () => {
                      if (!pendingCheckout && (!quote || quoteMessage || syncError)) return;
                      setWalletDialogOpen(true);
                    } : handleSubmitOrder}
                    isLoading={submitBusy}
                    className="w-full checkout-submit"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">تحويل المبلغ عبر المحفظة الإلكترونية</DialogTitle>
            <DialogDescription className="text-center">استخدم المبلغ ومرجع الطلب الظاهرين هنا ثم أكد الطلب.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card><CardContent className="text-center p-4"><p className="mb-2">المبلغ المطلوب:</p><p className="text-2xl font-bold text-primary">{money(displayedTotal)} ج.م</p></CardContent></Card>

            <div className="space-y-3">
              <p className="text-sm">حوّل المبلغ عبر فودافون كاش أو انستا باي إلى:</p>
              <div className="flex items-center justify-between bg-muted p-3 rounded-lg"><span className="font-mono font-bold text-lg">{WALLET_PHONE_NUMBER}</span><Button variant="ghost" size="sm" onClick={() => copyToClipboard(WALLET_PHONE_NUMBER, 'phone')} className="h-8 w-8 p-0">{copiedPhone ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div>
            </div>

            <div className="space-y-3">
              <p className="text-sm">اكتب مرجع الطلب مع التحويل أو احتفظ به عند إرسال لقطة إثبات الدفع:</p>
              <div className="flex items-center justify-between gap-2 bg-muted p-3 rounded-lg"><span className="min-w-0 break-all font-mono text-xs font-medium">{orderReference}</span><Button variant="ghost" size="sm" onClick={() => copyToClipboard(orderReference, 'order')} className="h-8 w-8 shrink-0 p-0">{copiedOrderNumber ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div>
            </div>

            <Button onClick={handleSubmitOrder} className="w-full" disabled={isLoading}>{isLoading ? 'جاري تأكيد الطلب...' : 'تأكيد الطلب'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </CheckoutLayout>
  );
};

export default Payment;
