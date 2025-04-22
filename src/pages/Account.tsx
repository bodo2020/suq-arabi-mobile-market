
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Package, Heart, ChevronLeft, Phone, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type CustomerType = {
  user_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  name?: string | null;
};

const Account = () => {
  const [user, setUser] = useState(supabase.auth.getUser() as any | null);
  const [customer, setCustomer] = useState<CustomerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [userArea, setUserArea] = useState<string | null>(null);
  const [userNeighborhood, setUserNeighborhood] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth listener to update user state
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // When user changes, reload customer info
      if (session?.user) {
        loadCustomer(session.user.id);
      } else {
        setCustomer(null);
        setLoading(false);
      }
    });

    const loadCustomer = async (userId: string) => {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) {
        console.error('Error fetching customer', error);
        setCustomer(null);
      } else {
        setCustomer(data);
      }
      setLoading(false);
    };

    // Load initial session and customer data
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        loadCustomer(sessionUser.id);
      } else {
        setLoading(false);
      }
    });

    // Load location data from localStorage
    const area = localStorage.getItem('userArea');
    const neighborhood = localStorage.getItem('userNeighborhood');
    if (area) setUserArea(area);
    if (neighborhood) setUserNeighborhood(neighborhood);

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
              <h2 className="font-bold">{customer?.name || customer?.first_name && customer?.last_name ? `${customer.first_name} ${customer.last_name}` : ''}</h2>
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

          {/* Show address with area and neighborhood */}
          {(userArea || userNeighborhood) && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="flex items-start">
                <MapPin size={16} className="ml-2 mt-0.5 text-gray-500" />
                <div>
                  <div className="font-semibold mb-1">عنوان التوصيل</div>
                  <p className="text-gray-600">
                    {userNeighborhood && `حي ${userNeighborhood}`}
                    {userArea && userNeighborhood && '، '}
                    {userArea && `منطقة ${userArea}`}
                  </p>
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
