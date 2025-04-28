import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from "@/components/ui/button"
import { ArrowRight, User, MapPin, ListChecks, Heart, ChevronLeft } from 'lucide-react';
import { Address, getAddresses } from '@/lib/supabase';
import { Separator } from "@/components/ui/separator";

const Account = () => {
  const { user, loading, signOut } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/phone-login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <h1 className="text-xl font-bold mb-4">يرجى تسجيل الدخول</h1>
          <Button onClick={() => navigate('/phone-login')} className="bg-primary text-white">
            تسجيل الدخول
          </Button>
        </div>
      </MainLayout>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
              </div>

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
              <Button onClick={() => navigate('/register')} size="lg">
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
