import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import DeliveryMap, { Coordinates } from '@/components/ui/DeliveryMap';
import BrandLoader from '@/components/ui/BrandLoader';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { safeReturnTo } from '@/lib/onboarding';
import { customerRpc } from '@/lib/customerPersistence';
import { readGuestAddress, resolveDeliveryLocation, saveGuestAddress } from '@/lib/deliveryAddress';

export default function Address() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const checkout = params.get('returnTo') === '/payment';
  const onboarding = params.get('onboarding') === '1' && !id;
  const required = params.get('required') === '1' && !id;
  const returnTo = safeReturnTo(params.get('returnTo'));
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user, authLoading } = useUser();
  const [address, setAddress] = useState('');
  const [addressEdited, setAddressEdited] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const back = required || onboarding ? returnTo : checkout ? '/addresses?returnTo=%2Fpayment' : user ? '/addresses' : returnTo;
  const saveLabel = user
    ? (required ? 'حفظ العنوان وابدأ التسوق' : onboarding ? 'حفظ العنوان والمتابعة' : 'حفظ العنوان')
    : required ? 'استخدام العنوان وابدأ التسوق' : 'استخدام العنوان كضيف';

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    setAddress('');
    setAddressEdited(false);
    setCoordinates(null);

    const guest = readGuestAddress();

    if (!user) {
      if (id) setLoadError('سجّل دخولك لتعديل عنوان محفوظ في الحساب.');
      else if (guest) {
        setAddress(guest.address);
        setAddressEdited(true);
        setCoordinates({ lat: guest.latitude, lng: guest.longitude });
      }
      setLoading(false);
      return;
    }

    if (!id) {
      if (required && guest) {
        setAddress(guest.address);
        setAddressEdited(true);
        setCoordinates({ lat: guest.latitude, lng: guest.longitude });
      }
      setLoading(false);
      return;
    }

    void supabase.from('customer_addresses').select('*').eq('id', id).eq('user_id', user.id).single().then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        setLoadError('تعذر تحميل العنوان. ارجع للعناوين وحاول تاني.');
        setLoading(false);
        return;
      }
      setAddress(data.address || '');
      setAddressEdited(Boolean(data.address));
      if (data.latitude != null && data.longitude != null) {
        setCoordinates({ lat: Number(data.latitude), lng: Number(data.longitude) });
      }
      setLoading(false);
    });

    return () => { active = false; };
  }, [id, user?.id, authLoading, required]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || loading || loadError) return;
    if (!coordinates) {
      setError('حدّد نقطة التوصيل على الخريطة الأول.');
      return;
    }
    if (!address.trim()) {
      setError('اكتب تفاصيل العنوان: الشارع ورقم البيت أو أي علامة مميزة.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const match = await resolveDeliveryLocation(coordinates.lat, coordinates.lng);
      if (!match) {
        setError('العنوان خارج نطاق التوصيل: مسافة الطريق الفعلية أكبر من 10 كم.');
        return;
      }

      if (!user) {
        saveGuestAddress({
          address: address.trim(),
          full_address: address.trim(),
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          assigned_branch_id: match.branch_id,
          branch_name: match.branch_name,
          distance_km: Number(match.road_distance_km),
          road_distance_km: Number(match.road_distance_km),
          road_duration_minutes: match.road_duration_minutes,
          delivery_price: Number(match.delivery_fee || 0),
          estimated_time: match.estimated_delivery_minutes,
          is_deliverable: true,
        });
        navigate(returnTo, { replace: true });
        return;
      }

      const values = {
        user_id: user.id,
        address: address.trim(),
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        governorate_id: null,
        city_id: null,
        area_id: null,
        neighborhood_id: null,
        road_distance_km: Number(match.road_distance_km),
        road_duration_minutes: match.road_duration_minutes,
        road_distance_checked_at: new Date().toISOString(),
      };

      const addresses = (supabase as any).from('customer_addresses');
      let savedAddressId: string | null = id || null;
      if (id) {
        const { data, error: updateError } = await addresses.update(values).eq('id', id).eq('user_id', user.id).select('id').single();
        if (updateError || !data) throw updateError || new Error('Missing address');
        savedAddressId = data.id;
      } else {
        const { count, error: countError } = await supabase.from('customer_addresses').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
        if (countError) throw countError;
        const { data: created, error: insertError } = await addresses.insert({ ...values, is_default: count === 0 }).select('id').single();
        if (insertError || !created) throw insertError || new Error('Missing address');
        savedAddressId = created.id;
        if (onboarding || required) {
          const { error: defaultError } = await customerRpc('set_default_customer_address', { p_address_id: created.id });
          if (defaultError) throw defaultError;
        }
      }

      await client.invalidateQueries({ queryKey: ['customerData'] });
      await client.invalidateQueries({ queryKey: ['onboarding-state', user.id] });
      await client.invalidateQueries({ queryKey: ['addresses', user.id] });
      await client.invalidateQueries({ queryKey: ['home-default-address', user.id] });
      await client.invalidateQueries({ queryKey: ['delivery-branch-id'] });
      await client.invalidateQueries({ queryKey: ['active-products'] });

      window.dispatchEvent(new CustomEvent('delivery-address-changed', { detail: { addressId: savedAddressId } }));

      if (onboarding || required) {
        window.dispatchEvent(new Event('customer-profile-ready'));
        navigate(returnTo, { replace: true });
        return;
      }
      navigate(back);
    } catch (saveError) {
      console.error(saveError);
      const code = (saveError as { message?: string })?.message || '';
      setError(code.includes('ROUTE')
        ? 'مش قادرين نحسب طريق التوصيل من Google حاليًا. جرّب مرة تانية بعد لحظات.'
        : 'العنوان لم يُحفظ. راجع اتصالك واضغط حفظ مرة تانية.');
    } finally {
      setSaving(false);
    }
  };

  return <CheckoutLayout step={2} showSteps={checkout && Boolean(user)} backTo={back} backLabel="رجوع">
    <div className="mb-6">
      <h1 className="checkout-title">{required ? 'حدد عنوانك قبل ما تبدأ التسوق' : onboarding ? 'آخر خطوة: عنوان التوصيل' : id ? 'تعديل عنوان التوصيل' : 'نوصل لك فين؟'}</h1>
      <p className="checkout-intro">هنطلب إذن الوصول لموقعك أول ما الخريطة تفتح عشان نوصل لعنوانك أسرع. لو رفضت الإذن، مفيش مشكلة: الخريطة هتتحول تلقائيًا للاختيار اليدوي وتقدر تحرك العلامة بنفسك.</p>
    </div>

    {loading || authLoading ? <div className="cart-loading"><BrandLoader size="lg" /></div> : loadError ? <div className="cart-alert" role="alert">{loadError}<Button variant="outline" onClick={() => navigate(back)}>رجوع</Button></div> :
      <form onSubmit={save} className="address-form grid gap-6 lg:grid-cols-[1.25fr_.75fr]" aria-busy={saving}>
        <section className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-green-50 p-2.5 text-primary"><MapPin size={20} /></div><div><h2 className="font-bold">حدد موقعك على الخريطة</h2><p className="text-sm text-gray-500">الموقع بيتحدد تلقائيًا لو سمحت بالإذن، وبعدها تقدر تزبط العلامة على باب البيت بالضبط.</p></div></div>
          <DeliveryMap
            key={id || (user ? 'new-user' : 'guest')}
            value={coordinates}
            autoLocate={!coordinates && !id}
            onChange={value => { setCoordinates(value); setError(''); }}
            onAddressResolved={resolved => {
              if (!addressEdited && resolved) setAddress(resolved);
            }}
          />
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold mb-2">تفاصيل العنوان</h2>
          <p className="text-sm text-gray-600 mb-5">هنحط أقرب عنوان من الخريطة تلقائيًا. كمّل عليه رقم البيت، الدور، الشقة أو علامة مميزة عشان المندوب يوصل بسهولة.</p>
          <div className="rounded-2xl bg-green-50 p-4 mb-5 text-sm text-gray-700"><div className="flex items-center gap-2 font-bold text-primary mb-1"><ShieldCheck size={17} />التحقق من التوصيل</div><p>عند الحفظ بنحسب مسافة القيادة الفعلية من الفرع. العنوان يتقبل فقط لو الطريق 10 كم أو أقل.</p></div>
          <label htmlFor="delivery-details" className="block font-medium mb-2">الشارع، البيت، الدور والشقة</label>
          <textarea
            id="delivery-details"
            value={address}
            onChange={event => {
              setAddress(event.target.value);
              setAddressEdited(true);
              setError('');
            }}
            rows={5}
            maxLength={1000}
            required
            placeholder="مثال: شارع المدرسة، منزل ١٢، الدور ٢ — بجوار الصيدلية"
            className="w-full rounded-xl border p-3 text-base leading-7"
            aria-describedby={error ? 'address-error' : undefined}
          />
          {coordinates && <div className="mt-3 flex items-center gap-2 text-xs text-gray-500"><Navigation size={14} /><span>{coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</span></div>}
          {error && <p id="address-error" className="text-sm text-red-700 mt-4" role="alert">{error}</p>}
          <Button type="submit" disabled={saving} className="address-desktop-submit cart-primary mt-5">{saving ? <BrandLoader size="sm" /> : saveLabel}</Button>
          {!user && <p className="mt-3 text-center text-xs text-gray-500">هنحفظ العنوان على الجهاز مؤقتًا. تقدر تسجّل دخولك بعدين لإكمال الطلب وحفظه في حسابك.</p>}
        </section>

        <div className="address-mobile-action" aria-label="تأكيد عنوان التوصيل">
          <Button type="submit" disabled={saving} className="cart-primary">{saving ? <BrandLoader size="sm" /> : saveLabel}</Button>
        </div>
      </form>}
  </CheckoutLayout>;
}
