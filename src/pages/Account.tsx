
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from "@/components/ui/button"
import { ArrowRight, User, MapPin, ListChecks, Heart, ChevronLeft } from 'lucide-react';
import { Address, getAddresses } from '@/lib/supabase';
import { Separator } from "@/components/ui/separator";

const Account = () => {
  const { user, signOut } = useUser();
  const navigate = useNavigate();
  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    const fetchAddress = async () => {
      if (user) {
        try {
          const addresses = await getAddresses(user.id);
          const defaultAddress = addresses?.find(addr => addr.is_default);
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
      <div className="pt-2">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">حسابي</h1>

          {user ? (
            <div className="space-y-4">
              {/* User Info Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="mr-4">
                    <h2 className="font-semibold">{user.email}</h2>
                    <p className="text-sm text-gray-500">مرحباً بك في ماركت المعداوي</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/account/edit')}>
                  تعديل البيانات الشخصية
                  <ChevronLeft className="mr-2 h-4 w-4" />
                </Button>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-3">
                <Link to="/favorites" className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
                  <Heart className="h-6 w-6 text-primary mb-2" />
                  <span className="text-sm font-medium">المفضلة</span>
                </Link>
                <Link to="/orders" className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
                  <ListChecks className="h-6 w-6 text-primary mb-2" />
                  <span className="text-sm font-medium">الطلبات</span>
                </Link>
              </div>

              {/* Address Section */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center">
                    <MapPin className="h-5 w-5 ml-2 text-primary" />
                    عنوان التوصيل
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/account/addresses')}>
                    إدارة العناوين
                    <ChevronLeft className="mr-2 h-4 w-4" />
                  </Button>
                </div>
                {address ? (
                  <p className="text-sm text-gray-600">{formatAddressDisplay(address)}</p>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-500 mb-2">لا يوجد عنوان محفوظ</p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/account/addresses')}>
                      إضافة عنوان جديد
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Logout Button */}
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                className="w-full"
              >
                تسجيل الخروج
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <h2 className="text-xl font-semibold mb-2">مرحباً بك</h2>
              <p className="text-gray-500 mb-4">قم بتسجيل الدخول للوصول إلى حسابك</p>
              <Button onClick={() => navigate('/account/register')} size="lg">
                تسجيل الدخول
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Account;
