import React, { useEffect, useState } from 'react';
import AddressSelector from '@/components/ui/AddressSelector';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { readGuestAddress } from '@/lib/deliveryAddress';

interface AddressGuardProps { children: React.ReactNode; }

const AddressGuard: React.FC<AddressGuardProps> = ({ children }) => {
  const [hasAddress, setHasAddress] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void checkAddress(); }, []);

  const checkAddress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('customer_addresses')
          .select('id, latitude, longitude, is_deliverable')
          .eq('user_id', user.id)
          .eq('is_deliverable', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(1);
        if (data && data.length > 0) {
          setHasAddress(true);
          setLoading(false);
          return;
        }
      }
      setHasAddress(Boolean(readGuestAddress()));
    } catch (error) {
      console.error('Error checking address:', error);
      setHasAddress(Boolean(readGuestAddress()));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg space-y-4"><Skeleton className="w-16 h-16 rounded-full mx-auto" /><Skeleton className="h-6 w-3/4 mx-auto" /><Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-full rounded-xl" /></div></div>;
  }

  if (!hasAddress) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-7 max-w-md w-full text-center shadow-lg border border-gray-100">
      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><MapPin className="w-8 h-8 text-primary" /></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">نوصل لك فين؟</h2>
      <p className="text-gray-600 mb-2">حدد مكانك على الخريطة الأول عشان نعرف المنتجات المتاحة والتوصيل.</p>
      <p className="text-sm text-gray-500 mb-6">مش لازم تسجّل دخول. ولو ما سمحتش بالموقع، الخريطة هتبدأ من فرع المعداوي وتقدر تحركها بنفسك.</p>
      <AddressSelector onAddressSelect={() => setHasAddress(true)}><Button className="w-full min-h-12 rounded-xl"><MapPin className="w-4 h-4 ml-2" />تحديد عنوان التوصيل</Button></AddressSelector>
    </div></div>;
  }

  return <>{children}</>;
};

export default AddressGuard;
