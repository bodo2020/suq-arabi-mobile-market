import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, MapPin, Route, ShieldCheck, Store, Wallet } from 'lucide-react';
import DeliveryRouteSummary from '@/components/checkout/DeliveryRouteSummary';
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
import { isCombinedCart } from '@/contexts/cartTypes';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  combinedCheckoutError,
  combinedCheckoutSources,
  combinedDefinitelyRejected,
  placeCombinedOrder,
  quoteCombinedOrder,
  readPendingCombinedCheckout,
  removePendingCombinedCheckout,
  savePendingCombinedCheckout,
  type PendingCombinedCheckout,
} from '@/lib/combinedCheckout';
import { DEFAULT_SUBSTITUTION_POLICY, type SubstitutionPolicy } from '@/lib/substitutionPolicy';

const WALLET_PHONE_NUMBER = '01005245096';
const money = (value: number) => new Intl.NumberFormat('ar-EG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

export default function CombinedPayment() {
  const navigate = useNavigate();
  const { checkoutItems: items, completeCheckout, isInitialized, syncError, isSaving } = useCart();
  const { user, authLoading } = useUser();
  const { toast } = useToast();
  const submitting = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [notes, setNotes] = useState('');
  const [substitutionPolicy, setSubstitutionPolicy] = useState<SubstitutionPolicy>(DEFAULT_SUBSTITUTION_POLICY);
  const [groupId, setGroupId] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState<PendingCombinedCheckout | null>(null);
  const [loading, setLoading] = useState(false);

  const liveSources = useMemo(() => {
    try {
      return combinedCheckoutSources(items);
    } catch {
      return [];
    }
  }, [items]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = readPendingCombinedCheckout(user.id);
      if (saved) {
        setPending(saved);
        setGroupId(saved.groupId as `${string}-${string}-${string}-${string}-${string}`);
        setPaymentMethod(saved.paymentMethod);
        setNotes(saved.notes || '');
        setSubstitutionPolicy(saved.substitutionPolicy);
      }
    } catch {
      removePendingCombinedCheckout(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && isInitialized && !user) {
      navigate('/phone-verify?returnTo=%2Fcombined-payment', { replace: true });
    }
  }, [authLoading, isInitialized, user, navigate]);

  useEffect(() => {
    if (!pending && isInitialized && items.length > 0 && !isCombinedCart(items)) {
      navigate('/cart', { replace: true });
    }
  }, [pending, isInitialized, items, navigate]);

  const customerQuery = useQuery({
    queryKey: ['combined-payment-customer', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: customer, error: customerError }, { data: address, error: addressError }] = await Promise.all([
        supabase.from('customers').select('id,name,phone').eq('user_id', user!.id).maybeSingle(),
        supabase.from('customer_addresses')
          .select('id,address,latitude,longitude')
          .eq('user_id', user!.id)
          .eq('is_default', true)
          .maybeSingle(),
      ]);
      if (customerError) throw customerError;
      if (addressError) throw addressError;
      return { customer, address };
    },
    staleTime: 5_000,
  });

  const addressId = pending?.addressId || customerQuery.data?.address?.id || '';
  const effectiveSources = pending?.sources || liveSources;

  const quoteQuery = useQuery({
    queryKey: ['combined-checkout-quote', user?.id, addressId, JSON.stringify(effectiveSources)],
    queryFn: () => quoteCombinedOrder(effectiveSources, addressId),
    enabled: !!user && !!addressId && effectiveSources.length >= 2,
    staleTime: 3_000,
    retry: false,
  });

  const quote = quoteQuery.data;

  const handleSubmit = async () => {
    if (submitting.current || loading || isSaving) return;
    if (!user) return navigate('/phone-verify?returnTo=%2Fcombined-payment');
    if (!customerQuery.data?.customer?.id || !customerQuery.data.customer.name?.trim()) {
      return navigate('/register?returnTo=%2Fcombined-payment');
    }
    if (!addressId) return navigate('/addresses?returnTo=%2Fcombined-payment');
    if (syncError && !pending) {
      return toast({
        title: 'السلة لم تُحفظ بعد',
        description: 'أعد المحاولة قبل تأكيد الطلب.',
        variant: 'destructive',
      });
    }
    if (!pending && (!quote || quoteQuery.isFetching)) {
      return toast({
        title: 'لسه بنراجع الطلب',
        description: quoteQuery.error
          ? combinedCheckoutError(quoteQuery.error)
          : 'بنراجع أسعار ومخزون كل متجر ومسار التوصيل.',
        variant: 'destructive',
      });
    }

    submitting.current = true;
    setLoading(true);
    try {
      const candidate: PendingCombinedCheckout = pending || {
        groupId,
        sources: effectiveSources,
        addressId,
        paymentMethod,
        notes: notes.trim(),
        quoteToken: quote!.quote_token,
        routeQuoteId: quote!.route_quote_id,
        total: quote!.total,
        substitutionPolicy,
      };

      if (!pending) savePendingCombinedCheckout(user.id, candidate);
      setPending(candidate);

      const placed = await placeCombinedOrder(candidate);
      removePendingCombinedCheckout(user.id);
      setPending(null);
      completeCheckout(candidate.groupId, candidate.sources);

      const leadOrderId = placed.orders?.find(order => order.source_kind === 'owned')?.order_id
        || placed.orders?.[0]?.order_id;
      navigate('/order-success', {
        state: {
          orderId: leadOrderId,
          orderGroupId: placed.order_group_id,
          orderNumber: placed.tracking_number,
          amountDue: placed.amount_due,
          combined: true,
          storesCount: placed.stores_count,
        },
      });
    } catch (error) {
      const message = combinedCheckoutError(error);
      if (combinedDefinitelyRejected(error)) {
        removePendingCombinedCheckout(user.id);
        setPending(null);
        setGroupId(crypto.randomUUID());
        await quoteQuery.refetch();
        toast({
          title: 'راجع الطلب قبل التأكيد',
          description: message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'تعذر التأكد من نتيجة الطلب',
          description: message + ' اضغط تأكيد مرة تانية؛ هنستخدم نفس رقم المجموعة بدون تكرار الطلب.',
          variant: 'destructive',
        });
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  if (authLoading || !isInitialized || !user) {
    return <CheckoutLayout step={2}><div className="flex justify-center py-20"><BrandLoader size="lg" /></div></CheckoutLayout>;
  }

  if (!items.length && !pending) {
    return <CheckoutLayout step={2}>
      <div className="mx-auto max-w-md py-20 text-center">
        <Store className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-xl font-black">السلة فارغة</h1>
        <Button className="mt-5" onClick={() => navigate('/')}>ابدأ التسوق</Button>
      </div>
    </CheckoutLayout>;
  }

  return <CheckoutLayout step={2}>
    <h1 className="checkout-title">تأكيد الطلب المجمّع</h1>
    <p className="checkout-intro">
      اختياراتك من كل محل واضحة قدامك، وتوصيل واحد يجمعها لحد بابك.
    </p>

    {pending && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <strong>محاولة الطلب محفوظة بأمان.</strong>
      <p className="mt-1">لو الاتصال انقطع، إعادة التأكيد هتكمل نفس مجموعة الطلبات بدون تكرار.</p>
    </div>}

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              المتاجر في الطلب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(quote?.sources || []).map((source, index) => {
              const name = source.source_kind === 'owned'
                ? quote?.hub_branch_name || 'ســــــوبـرمــــاركو'
                : source.plan.merchant_name || source.plan.branch_name || 'متجر شريك';
              return <div key={source.branch_id + source.source_kind} className="rounded-2xl border border-[#d8ebdf] bg-[#f8fcf9] p-4">
                <div>
                  <p className="text-xs font-bold text-primary">
                    {source.source_kind === 'owned' ? 'فرع ســــــوبـرمــــاركو' : 'متجر شريك'}
                  </p>
                  <strong className="mt-1 block">{index + 1}. {name}</strong>
                </div>
                <ul className="my-3 divide-y divide-[#e1eee7] border-y border-[#e1eee7] text-sm">
                  {source.plan.items.map((item, itemIndex) => <li key={item.product_id + ':' + itemIndex} className="flex justify-between gap-3 py-2">
                    <span>{item.name || item.product_name || 'صنف'}</span><strong className="shrink-0">{money(item.total)} ج.م</strong>
                  </li>)}
                </ul>
                <div className="flex justify-between text-sm"><span>إجمالي المحل</span><strong className="text-primary">{money(source.plan.subtotal)} ج.م</strong></div>
              </div>;
            })}
          </CardContent>
        </Card>

        {quote?.delivery && <DeliveryRouteSummary delivery={quote.delivery} />}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              عنوان التوصيل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{customerQuery.data?.address?.address || 'جاري تحميل العنوان...'}</p>
            <Button
              variant="link"
              className="mt-2 px-0"
              onClick={() => navigate('/addresses?returnTo=%2Fcombined-payment')}
              disabled={!!pending}
            >
              تغيير العنوان
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>طريقة الدفع</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={value => !pending && setPaymentMethod(value as 'cash' | 'wallet')}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Label className="flex cursor-pointer items-center gap-3 rounded-2xl border p-4">
                <RadioGroupItem value="cash" />
                <CreditCard className="h-5 w-5 text-primary" />
                <span><strong className="block">كاش عند الاستلام</strong><small className="text-gray-500">دفع واحد للمندوب</small></span>
              </Label>
              <Label className="flex cursor-pointer items-center gap-3 rounded-2xl border p-4">
                <RadioGroupItem value="wallet" />
                <Wallet className="h-5 w-5 text-primary" />
                <span><strong className="block">محفظة إلكترونية</strong><small className="text-gray-500">{WALLET_PHONE_NUMBER}</small></span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        <SubstitutionPreferenceCard value={pending?.substitutionPolicy || substitutionPolicy} onChange={setSubstitutionPolicy} disabled={!!pending} />

        <Card>
          <CardHeader><CardTitle>ملاحظات الطلب</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={event => !pending && setNotes(event.target.value)}
              maxLength={1000}
              placeholder="مثلاً: اتصل قبل الوصول"
              disabled={!!pending}
            />
          </CardContent>
        </Card>
      </div>

      <aside>
        <Card className="sticky top-4">
          <CardHeader><CardTitle>ملخص المجموعة</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {quoteQuery.isLoading ? <div className="flex justify-center py-8"><BrandLoader size="md" /></div>
              : quoteQuery.error ? <div className="rounded-xl bg-red-50 p-3 text-red-700">{combinedCheckoutError(quoteQuery.error)}</div>
              : <>
                <div className="flex justify-between"><span>المتاجر</span><strong>{quote?.stores_count || 0}</strong></div>
                <div className="flex justify-between"><span>قيمة المنتجات</span><strong>{money(quote?.subtotal || pending?.total || 0)} ج.م</strong></div>
                <div className="flex justify-between">
                  <span>التوصيل</span>
                  <strong>{Number(quote?.shipping_cost || 0) <= 0 ? 'مجاني' : money(quote?.shipping_cost || 0) + ' ج.م'}</strong>
                </div>
                {Number(quote?.merchant_delivery_subsidy || 0) > 0 && <div className="flex justify-between text-green-700">
                  <span>دعم المتاجر للتوصيل</span>
                  <strong>{money(quote!.merchant_delivery_subsidy)} ج.م</strong>
                </div>}
                {Number(quote?.elmadawy_delivery_subsidy || 0) > 0 && <div className="flex justify-between text-green-700">
                  <span>دعم ســــــوبـرمــــاركو للتوصيل</span>
                  <strong>{money(quote!.elmadawy_delivery_subsidy)} ج.م</strong>
                </div>}
                <div className="flex justify-between border-t pt-3 text-base">
                  <span>الإجمالي</span>
                  <strong className="text-primary">{money(quote?.total || pending?.total || 0)} ج.م</strong>
                </div>
              </>}

            <Button
              className="mt-3 h-12 w-full"
              onClick={() => void handleSubmit()}
              disabled={loading || isSaving || quoteQuery.isFetching || (!pending && !quote)}
            >
              {loading ? <BrandLoader size="sm" /> : <ShieldCheck size={18} />}
              تأكيد الطلب المجمّع
            </Button>
            <p className="text-center text-xs leading-5 text-gray-500">
              تابع تجهيز كل محل من صفحة طلباتك، وتكلفة التوصيل محسوبة مرة واحدة للمجموعة.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  </CheckoutLayout>;
}
