
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Package, Heart, ChevronLeft, Phone, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type UserType = {
  id: string;
  email?: string;
};

type ProfileType = {
  user_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
};

type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'PASSWORD_RECOVERY';

type AuthChangeCallback = (event: AuthChangeEvent, session: any) => void;

// Define session data structure to avoid excessive type inference
type SessionData = {
  session: {
    user: UserType | null;
  } | null;
};

const Account = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Handle auth state changes without trying to infer complex nested types
    const handleAuthStateChange: AuthChangeCallback = (event, session) => {
      setUser(session?.user || null);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    
    const getUser = async () => {
      setLoading(true);
      try {
        // Explicitly type the session data to prevent deep inference
        const { data }: { data: SessionData } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          // Get customer profile
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', data.session.user.id)
            .single();
            
          setProfile(customerData);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getUser();
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "تم تسجيل الخروج بنجاح",
        variant: "default",
      });
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "حدث خطأ أثناء تسجيل الخروج",
        variant: "destructive",
      });
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
              <h2 className="font-bold">{profile?.first_name} {profile?.last_name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              {profile?.phone && <p className="text-sm text-gray-500 flex items-center mt-1">
                <Phone size={14} className="ml-1" />
                {profile.phone}
              </p>}
            </div>
            <div className="mr-auto">
              <Link to="/account/edit" className="text-primary text-sm flex items-center">
                تعديل
                <ChevronLeft size={16} />
              </Link>
            </div>
          </div>
          
          {profile?.address && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="flex items-start">
                <MapPin size={16} className="ml-2 mt-0.5 text-gray-500" />
                <div>
                  <div className="font-semibold mb-1">عنوان التوصيل</div>
                  <p className="text-gray-600">{profile.address}</p>
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
