import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import DeliveryMap, { Coordinates } from '@/components/ui/DeliveryMap';
import LocationPicker, { LocationValue } from '@/components/ui/LocationPicker';
import BrandLoader from '@/components/ui/BrandLoader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MapPin, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { safeReturnTo } from '@/lib/onboarding';
import { customerRpc } from '@/lib/customerPersistence';

export default function Address() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const checkout = params.get('returnTo') === '/payment';
  const onboarding = params.get('onboarding') === '1' && !id;
  const onboardingReturnTo = safeReturnTo(params.get('returnTo'));
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user, authLoading } = useUser();
  const [address, setAddress] = useState('');
  const [mode, setMode] = useState<'map' | 'manual'>('map');
  const [location, setLocation] = useState<LocationValue>({});
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const back = onboarding ? onboardingReturnTo : checkout ? '/addresses?returnTo=%2Fpayment' : '/addresses';
  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true); setLoadError(''); setAddress(''); setCoordinates(null); setLocation({});
    if (!user || !id) { setLoading(false); return; }
    void supabase.from('customer_addresses').select('*').eq('id', id).eq('user_id', user.id).single().then(({ data, error }) => {
      if (!active) return;
      if (error || !data) { setLoadError('تعذر تحميل العنوان. ارجع للعناوين وحاول تاني.'); setLoading(false); return; }
      setAddress(data.address);
      setMode(data.latitude != null && data.longitude != null ? 'map' : 'manual');
      setLocation({ governorate: data.governorate_id || undefined, city: data.city_id || undefined, area: data.area_id || undefined, neighborhood: data.neighborhood_id || undefined });
      if (data.latitude != null && data.longitude != null) setCoordinates({ lat: Number(data.latitude), lng: Number(data.longitude) });
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, user?.id, authLoading]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !user || loading || loadError) return;
    if (!address.trim() || !location.neighborhood) { setError('اختار منطقة التوصيل كاملة واكتب تفاصيل العنوان.'); return; }
    if (mode === 'map' && !coordinates) { setError('حدّد نقطة على الخريطة، أو اختار إدخال العنوان يدويًا.'); return; }
    setSaving(true); setError('');
    try {
      const values = { user_id: user.id, address: address.trim(), governorate_id: location.governorate || null,
        city_id: location.city || null, area_id: location.area || null, neighborhood_id: location.neighborhood,
        latitude: mode === 'map' ? coordinates?.lat ?? null : null, longitude: mode === 'map' ? coordinates?.lng ?? null : null };
      if (id) {
        const { data, error } = await supabase.from('customer_addresses').update(values).eq('id', id).eq('user_id', user.id).select('id').single();
        if (error || !data) throw error || new Error('Missing address');
      } else {
        const { count, error: countError } = await supabase.from('customer_addresses').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
        if (countError) throw countError;
        const { data: created, error } = await supabase.from('customer_addresses').insert({ ...values, is_default: count === 0 }).select('id').single();
        if (error || !created) throw error || new Error('Missing address');
        if (onboarding) {
          const { error: defaultError } = await customerRpc('set_default_customer_address', { p_address_id: created.id });
          if (defaultError) throw defaultError;
        }
      }
      await client.invalidateQueries({ queryKey: ['customerData'] });
      await client.invalidateQueries({ queryKey: ['onboarding-state', user.id] });
      if (onboarding) {
        window.dispatchEvent(new Event('customer-profile-ready'));
        navigate(onboardingReturnTo, { replace: true });
        return;
      }
      navigate(back);
    } catch { setError('العنوان لم يُحفظ. راجع اتصالك واضغط حفظ مرة تانية.'); }
    finally { setSaving(false); }
  };
  return <CheckoutLayout step={2} showSteps={checkout} backTo={back} backLabel={onboarding ? 'رجوع' : 'رجوع للعناوين'}><div className="mb-6"><h1 className="checkout-title">{onboarding ? 'آخر خطوة: عنوان التوصيل' : id ? 'نظبط عنوانك؟' : 'نوصل لك فين؟'}</h1><p className="checkout-intro">{onboarding ? 'حدّد مكانك على الخريطة عشان نعرف نوصل لك، وده هيتحفظ كعنوانك الأساسي.' : 'حدّد مكانك، واكتب التفاصيل اللي تساعدنا نوصل لبابك.'}</p></div>
    {loading || authLoading ? <div className="cart-loading"><BrandLoader size="lg" /></div> : !user ? <section className="cart-empty"><h2 className="text-xl font-bold">سجّل دخولك لحفظ عنوانك</h2><p>عناوينك بتفضل محفوظة في حسابك للطلبات الجاية.</p><Button onClick={() => navigate('/phone-verify?returnTo=%2Fpayment')}>تسجيل الدخول</Button></section> : loadError ? <div className="cart-alert" role="alert">{loadError}<Button variant="outline" onClick={() => navigate(back)}>رجوع للعناوين</Button></div> :
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-2" aria-busy={saving}>
        <section className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6"><h2 className="text-lg font-bold mb-4">١. اختار طريقة إضافة العنوان</h2>
          <Tabs value={mode} onValueChange={value => { setMode(value as 'map' | 'manual'); setError(''); }} dir="rtl">
            <TabsList className="grid grid-cols-2 w-full h-auto p-1 mb-5 rounded-xl"><TabsTrigger disabled={saving} value="map" className="min-h-12 rounded-lg gap-2"><MapPin size={17} />على الخريطة</TabsTrigger><TabsTrigger disabled={saving} value="manual" className="min-h-12 rounded-lg gap-2"><PenLine size={17} />يدويًا</TabsTrigger></TabsList>
            <TabsContent value="map"><DeliveryMap key={id || 'new'} value={coordinates} onChange={setCoordinates} /><Button type="button" variant="ghost" className="mt-4 w-full min-h-11" onClick={() => setMode('manual')}>مش قادر تستخدم الخريطة؟ اكتب العنوان يدويًا</Button></TabsContent>
            <TabsContent value="manual"><div className="rounded-2xl bg-green-50 p-6 leading-8"><PenLine className="text-primary mb-4" size={28} /><h3 className="font-bold text-lg">اكتب عنوانك بطريقتك</h3><p className="text-gray-600 mt-2">اختار المحافظة والمنطقة، وبعدها اكتب الشارع ورقم العمارة والدور والشقة. ممكن تضيف علامة مميزة تساعد المندوب.</p><p className="text-sm text-gray-600 mt-3">مش محتاج تفتح الموقع أو تسمح بالوصول له. تقدر تضيف نقطة على الخريطة في أي وقت بعدين.</p></div></TabsContent>
          </Tabs>
        </section>
        <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold mb-2">٢. تفاصيل التوصيل</h2><p className="text-sm text-gray-600 mb-5">اختار المنطقة لحساب التوصيل، وراجع التفاصيل قبل الحفظ.</p><fieldset disabled={saving} className="space-y-5"><LocationPicker value={location} onChange={setLocation} /><div><label htmlFor="delivery-details" className="block font-medium mb-2">الشارع، العمارة، الدور والشقة</label><textarea id="delivery-details" value={address} onChange={event => { setAddress(event.target.value); setError(''); }} rows={4} maxLength={1000} required placeholder="مثال: شارع النصر، عمارة ١٢، الدور ٣، شقة ٧ — بجوار الصيدلية" className="w-full rounded-xl border p-3 text-base leading-7" aria-describedby={error ? 'address-error' : undefined} /></div></fieldset>{error && <p id="address-error" className="text-sm text-red-700 mt-4" role="alert">{error}</p>}<Button type="submit" disabled={saving} className="cart-primary">{saving ? <BrandLoader size="sm" /> : onboarding ? 'حفظ العنوان والمتابعة' : 'حفظ العنوان'}</Button>{!onboarding && <Button type="button" variant="ghost" disabled={saving} onClick={() => navigate(back)} className="w-full mt-2 min-h-11">رجوع للعناوين</Button>}</section>
      </form>}
  </CheckoutLayout>;
}
