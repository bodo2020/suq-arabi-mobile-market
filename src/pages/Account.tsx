
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from "@/components/ui/button"
import { ArrowRight, User, MapPin, ListChecks, Heart, ChevronLeft, Map } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { supabase } from '@/lib/supabase';
import GoogleMap from '@/components/ui/GoogleMap';

const Account = () => {
  const { user, loading, signOut } = useUser();
  const navigate = useNavigate();
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [userData, setUserData] = useState<{ name?: string } | null>(null);
  const [showMap, setShowMap] = useState(false);
  
  useEffect(() => {
    // Set a timeout to prevent infinite loading state
    const timer = setTimeout(() => {
      setLoadingComplete(true);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Fetch user profile data when user is available
    const fetchUserData = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('customers')
          .select('name')
          .eq('user_id', user.id)
          .single();
          
        if (data && !error) {
          setUserData(data);
        }
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Get the display name from various sources
  const getDisplayName = () => {
    if (userData?.name) {
      return userData.name;
    } else if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    } else if (user?.user_metadata?.first_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim();
    } else {
      return 'المستخدم';
    }
  };

  // Show loading state only for a limited time
  if (loading && !loadingComplete) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

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
                    <h2 className="font-semibold">{getDisplayName()}</h2>
                    <p className="text-sm text-gray-500">مرحباً بك في ماركت المعداوي</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/edit-account')}>
                  تعديل البيانات الشخصية
                  <ChevronLeft className="mr-2 h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => navigate('/addresses')} 
                  variant="ghost" 
                  className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow w-full h-auto"
                >
                  <div className="flex items-center">
                    <MapPin className="h-6 w-6 text-primary ml-3" />
                    <span className="text-sm font-medium">عناوين التوصيل</span>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-gray-400" />
                </Button>
                
                <Button 
                  onClick={() => navigate('/favorites')} 
                  variant="ghost" 
                  className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow w-full h-auto"
                >
                  <div className="flex items-center">
                    <Heart className="h-6 w-6 text-primary ml-3" />
                    <span className="text-sm font-medium">المفضلة</span>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-gray-400" />
                </Button>
                
                <Button 
                  onClick={() => navigate('/orders')} 
                  variant="ghost" 
                  className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow w-full h-auto"
                >
                  <div className="flex items-center">
                    <ListChecks className="h-6 w-6 text-primary ml-3" />
                    <span className="text-sm font-medium">الطلبات</span>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-gray-400" />
                </Button>

                <Button 
                  onClick={() => setShowMap(!showMap)} 
                  variant="ghost" 
                  className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow w-full h-auto"
                >
                  <div className="flex items-center">
                    <Map className="h-6 w-6 text-primary ml-3" />
                    <span className="text-sm font-medium">الخريطة</span>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-gray-400" />
                </Button>
              </div>

              {/* Map Section */}
              {showMap && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-lg font-semibold mb-3">الخريطة</h3>
                  <GoogleMap height="300px" className="w-full" />
                </div>
              )}

              <Separator className="my-4" />

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
              <Button 
                onClick={() => navigate('/phone-login')} 
                className="w-full"
              >
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
