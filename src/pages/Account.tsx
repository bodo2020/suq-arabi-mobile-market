
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Package, Heart, ChevronLeft, Phone, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Address } from '@/lib/supabase';

const Account = () => {
  const [user, setUser] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Get user from auth
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Get profile which now contains customer_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*, customer_id')
          .eq('id', user.id)
          .maybeSingle();

        let customerData = null;

        // Prefer loading customer by profiles.customer_id
        if (profile?.customer_id) {
          const { data: cust, error: custErr } = await supabase
            .from('customers')
            .select('*')
            .eq('id', profile.customer_id)
            .maybeSingle();
          customerData = cust;
          if (custErr) console.error('Error loading customer by customer_id:', custErr);
        }

        // Fallback: get customer by user.id (compatibility for existing users)
        if (!customerData) {
          const { data: custByUid, error: custByUidErr } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          customerData = custByUid;
          if (custByUidErr) console.error('Error loading customer by user_id:', custByUidErr);
        }

        setCustomer(customerData);

        // Fetch addresses as before
        const { data: addressesData, error: addressesError } = await supabase
          .from('customer_addresses')
          .select(`
            *, 
            governorates(name),
            cities(name),
            areas(name),
            neighborhoods(name)
          `)
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (addressesError) {
          console.error('Error fetching addresses:', addressesError);
        }

        const enhancedAddresses = (addressesData || []).map(addr => ({
          ...addr,
          governorate_name: addr.governorates?.name,
          city_name: addr.cities?.name,
          area_name: addr.areas?.name,
          neighborhood_name: addr.neighborhoods?.name
        }));

        setAddresses(enhancedAddresses);

        // Store defaults in localStorage
        const defaultAddress = enhancedAddresses.find(a => a.is_default);
        if (defaultAddress) {
          localStorage.setItem('userArea', defaultAddress.area_name || '');
          localStorage.setItem('userNeighborhood', defaultAddress.neighborhood_name || '');
          localStorage.setItem('userAddress', defaultAddress.address || '');
        }
      } else {
        navigate('/account/register');
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "حدث خطأ أثناء تسجيل الخروج",
        variant: "destructive",
      });
      console.error(error);
    } else {
      toast({
        title: "تم تسجيل الخروج بنجاح",
        variant: "default",
      });
      navigate('/');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="py-4">
          <h1 className="text-xl font-bold text-center mb-6">الحساب</h1>

          <div className="bg-white rounded-lg p-6 mb-4 text-center">
            <User size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-bold mb-2">أهلاً بك</h2>
            <p className="text-gray-500 mb-4">سجل الدخول للوصول إلى حسابك وتتبع طلباتك وحفظ منتجاتك المفضلة.</p>

            <Link to="/account/register" className="block w-full bg-primary text-white py-3 rounded-lg text-center mb-3">
              تسجيل / دخول
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="py-4">
        <h1 className="text-xl font-bold text-center mb-6">الحساب</h1>

        {/* User Info */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex items-center mb-4">
            <div className="bg-gray-100 rounded-full p-3 ml-3">
              <User size={32} className="text-gray-500" />
            </div>
            <div>
              <h2 className="font-bold">
                {/* اعرض الاسم من بيانات العميل المربوطة */}
                {customer?.name || customer?.first_name && customer?.last_name ? `${customer.first_name} ${customer.last_name}` : ''}
              </h2>
              <p className="text-sm text-gray-500">{customer?.email ?? user.email}</p>
              {customer?.phone && <p className="text-sm text-gray-500 flex items-center mt-1">
                <Phone size={14} className="ml-1" />
                {customer.phone}
              </p>}
            </div>
            <div className="mr-auto">
              <Link to="/account/edit" className="text-primary text-sm flex items-center">
                تعديل
                <ChevronLeft size={16} />
              </Link>
            </div>
          </div>

          {addresses.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm mt-4">
              <div className="flex items-start">
                <MapPin size={16} className="ml-2 mt-0.5 text-gray-500" />
                <div>
                  <div className="font-semibold mb-1">عنوان التوصيل</div>
                  {addresses.map(addr => (
                    <div key={addr.id} className="text-gray-600 mb-2">
                      {addr.is_default && (
                        <span className="text-primary text-xs ml-2">افتراضي</span>
                      )}
                      {addr.neighborhood_name && `حي ${addr.neighborhood_name}`}
                      {addr.area_name && `, منطقة ${addr.area_name}`}
                    </div>
                  ))}
                  <Link to="/account/addresses" className="text-primary text-xs mt-2 block">
                    إدارة العناوين
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-lg mb-4">
          <Link to="/orders" className="flex items-center p-4 border-b">
            <Package size={20} className="ml-3 text-gray-500" />
            <span>الطلبات</span>
            <ChevronLeft size={18} className="mr-auto text-gray-400" />
          </Link>

          <Link to="/favorites" className="flex items-center p-4 border-b">
            <Heart size={20} className="ml-3 text-gray-500" />
            <span>المفضلة</span>
            <ChevronLeft size={18} className="mr-auto text-gray-400" />
          </Link>

          <Link to="/account/addresses" className="flex items-center p-4 border-b">
            <MapPin size={20} className="ml-3 text-gray-500" />
            <span>عناوين التوصيل</span>
            <ChevronLeft size={18} className="mr-auto text-gray-400" />
          </Link>

          <button 
            onClick={handleLogout}
            className="flex items-center p-4 w-full text-right text-red-500"
          >
            <LogOut size={20} className="ml-3" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Account;

