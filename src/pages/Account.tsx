import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from "@/components/ui/button"
import { ArrowRight, User, MapPin, ListChecks } from 'lucide-react';
import { Address } from '@/lib/supabase';

const Account = () => {
  const { user, signOut } = useUser();
  const navigate = useNavigate();
  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    const fetchAddress = async () => {
      if (user) {
        try {
          const { getAddresses } = await import('@/lib/supabase');
          const addresses = await getAddresses(user.id);
          const defaultAddress = addresses.find(addr => addr.is_default);
          setAddress(defaultAddress || null);
        } catch (error) {
          console.error('Error fetching address:', error);
        }
      }
    };

    fetchAddress();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatAddressDisplay = (address: Address) => {
    if (!address) return '';
    
    let parts = [address.address];
    
    // Use optional chaining to safely access potentially undefined properties
    // We'll pull them from governorate_id, city_id, etc. which are guaranteed to exist in our type
    
    if (address.neighborhood_id) {
      parts.push(`الحي: ${address.neighborhood_id}`);
    }
    
    if (address.area_id) {
      parts.push(`المنطقة: ${address.area_id}`);
    }
    
    return parts.join(', ');
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-4">حسابي</h1>

        {user ? (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-4">
              <div className="flex items-center mb-2">
                <User className="mr-2 h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold">معلومات المستخدم</h2>
              </div>
              <p><strong>اسم المستخدم:</strong> {user.email}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-4">
              <div className="flex items-center mb-2">
                <MapPin className="mr-2 h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold">عنوان التوصيل الافتراضي</h2>
              </div>
              {address ? (
                <>
                  <p>{formatAddressDisplay(address)}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/account/addresses')}>
                    تغيير العنوان
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <p>لا يوجد عنوان افتراضي. الرجاء إضافة عنوان.</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/account/addresses')}>
                    إضافة عنوان
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-4">
              <div className="flex items-center mb-2">
                <ListChecks className="mr-2 h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold">الطلبات</h2>
              </div>
              <p>عرض سجل طلباتك السابقة.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/orders')}>
                عرض الطلبات
                <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </div>

            <Button className="w-full" variant="destructive" onClick={handleSignOut}>
              تسجيل الخروج
            </Button>
          </>
        ) : (
          <div>
            <p>الرجاء تسجيل الدخول لعرض معلومات حسابك.</p>
            <Button onClick={() => navigate('/account/register')}>تسجيل الدخول</Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Account;
