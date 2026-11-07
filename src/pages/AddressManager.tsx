import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Home, Navigation, CheckCircle2, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import BrandLoader from '@/components/ui/BrandLoader';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { customerRpc } from '@/lib/customerPersistence';
import { readGuestAddress } from '@/lib/deliveryAddress';
import { invalidateMyAddresses, invalidateMyCustomer } from '@/lib/customerProfileCache';

type MapAddress = {
  id: string;
  user_id: string;
  address: string;
  is_default?: boolean | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  assigned_branch_id?: string | null;
  distance_km?: number | string | null;
  is_deliverable?: boolean | null;
};

const AddressManager = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnToPayment = params.get('returnTo') === '/payment';
  const queryClient = useQueryClient();
  const { user, authLoading } = useUser();
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<MapAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const guestAddress = !user ? readGuestAddress() : null;

  useEffect(() => {
    setAddresses([]);
    setLoading(true);
    if (!authLoading) void fetchAddresses();
  }, [user?.id, authLoading]);

  const fetchAddresses = async () => {
    const expectedUser = currentUser.current;
    setLoadError(false);
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const client = supabase as any;
      const { data, error } = await client
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (currentUser.current === expectedUser) setAddresses((data || []) as MapAddress[]);
    } catch (error) {
      if (currentUser.current === expectedUser) setLoadError(true);
      console.error('Error fetching addresses:', error);
      toast({ variant: 'destructive', title: 'تعذر تحميل العناوين', description: 'حاول مرة تانية.' });
    } finally {
      if (currentUser.current === expectedUser) setLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const selected = addresses.find(item => item.id === addressId);
      if (!selected?.latitude || !selected?.longitude || !selected?.is_deliverable) {
        toast({ variant: 'destructive', title: 'حدد الموقع الأول', description: 'لازم العنوان يكون محدد على الخريطة وداخل نطاق التوصيل.' });
        return;
      }
      const { error } = await customerRpc('set_default_customer_address', { p_address_id: addressId });
      invalidateMyAddresses();
      if (error) throw error;
      localStorage.setItem('userAddress', selected.address || '');
      localStorage.setItem('userArea', 'عنوان على الخريطة');
      localStorage.removeItem('userNeighborhood');
      await queryClient.invalidateQueries({ queryKey: ['customerData'] });
      await fetchAddresses();
      toast({ title: 'تم تحديث العنوان الافتراضي', description: 'هنستخدم العنوان ده في الطلبات الجاية.' });
    } catch (error) {
      console.error('Error setting default address:', error);
      toast({ variant: 'destructive', title: 'تعذر تحديث العنوان', description: 'حاول مرة تانية.' });
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.id) return;
    try {
      const target = addresses.find(item => item.id === addressId);
      const client = supabase as any;
      const { error } = await client.from('customer_addresses').delete().eq('id', addressId).eq('user_id', user.id);
      invalidateMyAddresses();
      if (error) throw error;
      const remaining = addresses.filter(item => item.id !== addressId);
      if (target?.is_default) {
        const next = remaining.find(item => item.latitude != null && item.longitude != null && item.is_deliverable);
        if (next) await customerRpc('set_default_customer_address', { p_address_id: next.id });
        invalidateMyAddresses();
      }
      await queryClient.invalidateQueries({ queryKey: ['customerData'] });
      await fetchAddresses();
      toast({ title: 'تم حذف العنوان' });
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({ variant: 'destructive', title: 'تعذر حذف العنوان', description: 'حاول مرة تانية.' });
    }
  };

  const addAddress = () => navigate(returnToPayment ? '/add-address?returnTo=%2Fpayment' : '/add-address');
  const editAddress = (addressId: string) => navigate(`/edit-address/${addressId}${returnToPayment ? '?returnTo=%2Fpayment' : ''}`);
  const defaultAddress = addresses.find(item => item.is_default);
  const defaultReady = Boolean(defaultAddress?.latitude != null && defaultAddress?.longitude != null && defaultAddress?.is_deliverable);

  return <CheckoutLayout step={2} showSteps={returnToPayment && Boolean(user)} backTo={returnToPayment ? '/payment' : '/account'} backLabel={returnToPayment ? 'رجوع للدفع' : 'رجوع'}>
    <div className="mb-6 flex items-start justify-between gap-4">
      <div><h1 className="checkout-title">{user ? 'عناوينك' : 'عنوان التوصيل'}</h1><p className="checkout-intro">كل عنوان لازم يكون محدد على الخريطة وداخل نطاق التوصيل.</p></div>
    </div>

    <div className="mx-auto max-w-3xl">
      {loading || authLoading ? <div className="flex h-40 items-center justify-center"><BrandLoader size="md" /></div> : !user ? (
        <div className="space-y-4">
          {guestAddress ? <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-bold"><MapPin size={18} className="text-primary" />عنوان الضيف</div><span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-primary">داخل نطاق التوصيل</span></div>
            <p className="leading-7 text-gray-700">{guestAddress.address}</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500"><Navigation size={15} /><span>يبعد {Number(guestAddress.distance_km).toFixed(1)} كم عن {guestAddress.branch_name}</span></div>
            <div className="mt-5 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => navigate('/add-address?returnTo=%2Faddresses')}>تعديل على الخريطة</Button><Button onClick={() => navigate('/phone-verify?returnTo=%2Fpayment')}><LogIn size={17} className="ml-2" />تسجيل الدخول للطلب</Button></div>
          </div> : <div className="cart-empty"><MapPin size={42} className="mx-auto text-primary" /><h2 className="text-xl font-bold">حدد مكانك الأول</h2><p>تقدر تختار عنوانك على الخريطة كضيف من غير تسجيل دخول.</p><Button className="cart-primary" onClick={() => navigate('/add-address?returnTo=%2Faddresses')}>فتح الخريطة</Button></div>}
        </div>
      ) : loadError ? <div className="cart-alert" role="alert">تعذر تحميل عناوينك.<Button variant="outline" onClick={() => void fetchAddresses()}>إعادة المحاولة</Button></div> : <>
        {returnToPayment && <div className="mb-5 rounded-2xl border border-green-100 bg-white p-4">
          <h2 className="text-lg font-bold">عنوان طلبك</h2>
          <p className="mt-1 text-sm text-gray-600">اختار عنوان محدد على الخريطة وداخل نطاق الـ10 كم.</p>
          {defaultReady ? <Button className="mt-4 h-12 w-full rounded-xl" onClick={() => navigate('/payment')}>متابعة للدفع</Button> : defaultAddress ? <Button className="mt-4 h-12 w-full rounded-xl" variant="outline" onClick={() => editAddress(defaultAddress.id)}>حدد موقع العنوان على الخريطة</Button> : null}
        </div>}

        {addresses.length > 0 ? <div className="space-y-4">{addresses.map(item => {
          const hasPoint = item.latitude != null && item.longitude != null;
          const ready = hasPoint && Boolean(item.is_deliverable);
          return <div key={item.id} className={`rounded-2xl bg-white p-5 border ${item.is_default ? 'border-2 border-primary' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2"><MapPin size={17} className="text-primary" /><span className="font-bold">{item.is_default ? 'العنوان الافتراضي' : 'عنوان توصيل'}</span>{ready ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs text-green-800"><CheckCircle2 size={13} />داخل نطاق التوصيل</span> : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800"><AlertTriangle size={13} />{hasPoint ? 'خارج النطاق' : 'يحتاج تحديد موقع'}</span>}</div>
                <p className="mb-3 leading-7 text-gray-700">{item.address}</p>
                {hasPoint && <div className="mb-3 flex items-center gap-2 text-sm text-gray-500"><Navigation size={15} /><span>{item.distance_km != null ? `يبعد ${Number(item.distance_km).toFixed(1)} كم` : `${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}`}</span></div>}
                <div className="flex flex-wrap gap-2"><button onClick={() => editAddress(item.id)} className="rounded-xl bg-gray-100 px-4 py-3 text-sm hover:bg-gray-200">{hasPoint ? 'تعديل' : 'حدد على الخريطة'}</button>{!item.is_default && ready && <button onClick={() => void handleSetDefault(item.id)} className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 hover:bg-green-100">تعيين كافتراضي</button>}{!item.is_default && <button onClick={() => void handleDeleteAddress(item.id)} className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 hover:bg-red-100">حذف</button>}</div>
              </div>
            </div>
          </div>;
        })}</div> : <div className="py-8 text-center"><Home size={40} className="mx-auto mb-2 text-gray-400" /><p className="text-gray-500">مفيش عناوين محفوظة</p></div>}

        <button onClick={addAddress} className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary p-3.5 text-white"><Plus size={18} className="ml-2" />إضافة عنوان جديد على الخريطة</button>
      </>}
    </div>
  </CheckoutLayout>;
};

export default AddressManager;
