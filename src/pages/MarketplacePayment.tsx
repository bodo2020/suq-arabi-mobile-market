import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, MapPin, ShieldCheck, Store, Wallet } from 'lucide-react';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import BrandLoader from '@/components/ui/BrandLoader';
import SubstitutionPreferenceCard from '@/components/checkout/SubstitutionPreferenceCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  marketplaceCheckoutError,
  marketplaceCheckoutLines,
  marketplaceDefinitelyRejected,
  placeMarketplaceOrder,
  quoteMarketplaceOrder,
  readPendingMarketplaceCheckout,
  removePendingMarketplaceCheckout,
  savePendingMarketplaceCheckout,
  type PendingMarketplaceCheckout,
} from '@/lib/marketplaceCheckout';
import { DEFAULT_SUBSTITUTION_POLICY, type SubstitutionPolicy } from '@/lib/substitutionPolicy';

const WALLET_PHONE_NUMBER = '01005245096';
const money = (value: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

export default function MarketplacePayment() {
  const navigate = useNavigate();
  const { items, clearCart, isInitialized, syncError, isSaving } = useCart();
  const { user, authLoading } = useUser();
  const { toast } = useToast();
  const submitting = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [notes, setNotes] = useState('');
  const [substitutionPolicy, setSubstitutionPolicy] = useState<SubstitutionPolicy>(DEFAULT_SUBSTITUTION_POLICY);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState<PendingMarketplaceCheckout | null>(null);
  const [loading, setLoading] = useState(false);

  const lines = useMemo(() => {
    try { return marketplaceCheckoutLines(items); } catch { return []; }
  }, [items]);
  const branchId = items[0]?.marketplace_branch_id || pending?.branchId || '';

  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = readPendingMarketplaceCheckout(user.id);
      if (saved) {
        setPending(saved);
        setRequestId(saved.requestId as `${string}-${string}-${string}-${string}-${string}`);
        setPaymentMethod(saved.paymentMethod);
        setNotes(saved.notes || '');
        setSubstitutionPolicy(saved.substitutionPolicy);
      }
    } catch {
      removePendingMarketplaceCheckout(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && isInitialized && !user) navigate('/phone-verify?returnTo=%2Fmarketplace-payment', { replace: true });
  }, [authLoading, isInitialized, user, navigate]);

  const customerQuery = useQuery({
    queryKey: ['marketplace-payment-customer', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: customer, error: customerError }, { data: address, error: addressError }] = await Promise.all([
        supabase.from('customers').select('id,name,phone').eq('user_id', user!.id).maybeSingle(),
        supabase.from('customer_addresses').select('id,address,latitude,longitude').eq('user_id', user!.id).eq('is_default', true).maybeSingle(),
      ]);
      if (customerError) throw customerError;
      if (addressError) throw addressError;
      return { customer, address };
    },
    staleTime: 5_000,
  });

  const addressId = pending?.addressId || customerQuery.data?.address?.id || '';
  const effectiveLines = pending?.items || lines;
  const effectiveBranch = pending?.branchId || branchId;
  const quoteQuery = useQuery({
    queryKey: ['marketplace-checkout-quote', user?.id, addressId, effectiveBranch, JSON.stringify(effectiveLines)],
    queryFn: () => quoteMarketplaceOrder(effectiveLines, addressId, effectiveBranch),
    enabled: !!user && !!addressId && !!effectiveBranch && effectiveLines.length > 0,
    staleTime: 3_000,
    retry: false,
  });

  const quote = quoteQuery.data;
  const handleSubmit = async () => {
    if (submitting.current || loading || isSaving) return;
    if (!user) return navigate('/phone-verify?returnTo=%2Fmarketplace-payment');
    if (!customerQuery.data?.customer?.id || !customerQuery.data.customer.name?.trim()) return navigate('/register?returnTo=%2Fmarketplace-payment');
    if (!addressId) return navigate('/addresses?returnTo=%2Fmarketplace-payment');
    if (syncError && !pending) return toast({ title: 'السلة لم تُحفظ بعد', description: 'أعد المحاولة قبل تأكيد الطلب.', variant: 'destructive' });
    if (!pending && (!quote || quoteQuery.isFetching)) return toast({ title: 'لسه بنراجع الطلب', description: quoteQuery.error ? marketplaceCheckoutError(quoteQuery.error) : 'انتظر مراجعة السعر والمخزون والتوصيل.', variant: 'destructive' });
    if (!pending && quote && !quote.minimum_order_met) return toast({ title: 'الحد الأدنى للطلب', description: `الطلب من المتجر ده لازم يكون على الأقل ${money(quote.min_order_amount)} ج.م.`, variant: 'destructive' });

    submitting.current = true;
    setLoading(true);
    try {
      const candidate: PendingMarketplaceCheckout = pending || {
        requestId,
        branchId: effectiveBranch,
        items: effectiveLines,
        addressId,
        paymentMethod,
        notes: notes.trim(),
        quoteToken: quote!.quote_token,
        total: quote!.total,
        substitutionPolicy,
      };
      if (!pending) savePendingMarketplaceCheckout(user.id, candidate);
      setPending(candidate);

      const placed = await placeMarketplaceOrder(candidate);
      removePendingMarketplaceCheckout(user.id);
      setPending(null);
      clearCart();
      navigate('/order-success', { state: { orderId: placed.id, orderNumber: placed.tracking_number, amountDue: placed.amount_due } });
    } catch (error) {
      const message = marketplaceCheckoutError(error);
      if (marketplaceDefinitelyRejected(error)) {
        removePendingMarketplaceCheckout(user.id);
        setPending(null);
        setRequestId(crypto.randomUUID());
        await quoteQuery.refetch();
        toast({ title: 'راجع الطلب قبل التأكيد', description: message, variant: 'destructive' });
      } else {
        toast({ title: 'تعذر التأكد من نتيجة الطلب', description: `${message} اضغط تأكيد مرة تانية؛ هنستخدم نفس رقم المحاولة بدون تكرار الطلب.`, variant: 'destructive' });
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  if (authLoading || !isInitialized || !user) return <CheckoutLayout step={2}><div className="flex justify-center py-20"><BrandLoader size="lg" /></div></CheckoutLayout>;
  if (!items.length && !pending) return <CheckoutLayout step={2}><div className="mx-auto max-w-md py-20 text-center"><Store className="mx-auto h-12 w-12 text-primary" /><h1 className="mt-4 text-xl font-black">السلة فارغة</h1><Button className="mt-5" onClick={() => navigate('/stores')}>تصفح المتاجر</Button></div></CheckoutLayout>;

  return <CheckoutLayout step={2}>
    <h1 className="checkout-title">تأكيد طلب المتجر</h1>
    <p className="checkout-intro">السعر والمخزون ومنطقة التوصيل بيتراجعوا من السيرفر قبل إنشاء الطلب. كوبونات المعداوي غير مطبقة على متاجر الشركاء في المرحلة الحالية.</p>

    {pending && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>محاولة الطلب محفوظة بأمان.</strong><p className="mt-1">لو الاتصال انقطع، إعادة التأكيد هتكمل نفس الطلب بدون إنشاء نسخة مكررة.</p></div>}

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-primary" />{quote?.merchant_name || items[0]?.merchant_name || 'المتجر'}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><strong>الفرع:</strong> {quote?.branch_name || items[0]?.marketplace_branch_name}</p><p><strong>منطقة التوصيل:</strong> {quote?.zone_name || 'جاري التحديد'}</p>{quote?.estimated_time && <p><strong>الوقت المتوقع:</strong> {quote.estimated_time}</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />عنوان التوصيل</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-700">{customerQuery.data?.address?.address || 'جاري تحميل العنوان...'}</p><Button variant="link" className="mt-2 px-0" onClick={() => navigate('/addresses?returnTo=%2Fmarketplace-payment')}>تغيير العنوان</Button></CardContent></Card>
        <Card><CardHeader><CardTitle>طريقة الدفع</CardTitle></CardHeader><CardContent><RadioGroup value={paymentMethod} onValueChange={value => !pending && setPaymentMethod(value as 'cash' | 'wallet')} className="grid gap-3 sm:grid-cols-2"><Label className="flex cursor-pointer items-center gap-3 rounded-2xl border p-4"><RadioGroupItem value="cash" /><CreditCard className="h-5 w-5 text-primary" /><span><strong className="block">كاش عند الاستلام</strong><small className="text-gray-500">ادفع للمندوب</small></span></Label><Label className="flex cursor-pointer items-center gap-3 rounded-2xl border p-4"><RadioGroupItem value="wallet" /><Wallet className="h-5 w-5 text-primary" /><span><strong className="block">محفظة إلكترونية</strong><small className="text-gray-500">{WALLET_PHONE_NUMBER}</small></span></Label></RadioGroup></CardContent></Card>
        <SubstitutionPreferenceCard value={pending?.substitutionPolicy || substitutionPolicy} onChange={setSubstitutionPolicy} disabled={!!pending} />
        <Card><CardHeader><CardTitle>ملاحظات الطلب</CardTitle></CardHeader><CardContent><Textarea value={notes} onChange={event => !pending && setNotes(event.target.value)} maxLength={1000} placeholder="مثلاً: اتصل قبل الوصول" disabled={!!pending} /></CardContent></Card>
      </div>
      <aside><Card className="sticky top-4"><CardHeader><CardTitle>ملخص الطلب</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{quoteQuery.isLoading ? <div className="flex justify-center py-8"><BrandLoader size="md" /></div> : quoteQuery.error ? <div className="rounded-xl bg-red-50 p-3 text-red-700">{marketplaceCheckoutError(quoteQuery.error)}</div> : <><div className="flex justify-between"><span>المنتجات</span><strong>{money(quote?.subtotal || pending?.total || 0)} ج.م</strong></div><div className="flex justify-between"><span>التوصيل</span><strong>{money(quote?.shipping_cost || 0)} ج.م</strong></div><div className="flex justify-between border-t pt-3 text-base"><span>الإجمالي</span><strong className="text-primary">{money(quote?.total || pending?.total || 0)} ج.م</strong></div>{quote && !quote.minimum_order_met && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">الحد الأدنى {money(quote.min_order_amount)} ج.م</p>}</>}
        <Button className="mt-3 h-12 w-full" onClick={() => void handleSubmit()} disabled={loading || isSaving || quoteQuery.isFetching || (!pending && (!quote || !quote.minimum_order_met))}>{loading ? <BrandLoader size="sm" tone="onGreen" /> : <ShieldCheck size={18} />}تأكيد الطلب</Button><p className="text-center text-xs leading-5 text-gray-500">كل طلب مربوط بمتجر واحد، والسيرفر يعيد التحقق من السعر والمخزون قبل الخصم.</p></CardContent></Card></aside>
    </div>
  </CheckoutLayout>;
}
