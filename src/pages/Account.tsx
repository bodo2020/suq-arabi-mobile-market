
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, User, MapPin, Phone, LogOut, ShoppingBag, Info } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

interface UserInfo {
  name: string;
  phone: string;
  address: string;
}

const Account = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  useEffect(() => {
    // Check localStorage for user info
    const name = localStorage.getItem('userName');
    const phone = localStorage.getItem('userPhone');
    const address = localStorage.getItem('userAddress');
    
    if (name && phone) {
      setUserInfo({ name, phone, address: address || '' });
    }
  }, []);
  
  const handleLogout = () => {
    // Clear user info from localStorage
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');
    
    // Update state
    setUserInfo(null);
  };
  
  return (
    <MainLayout>
      <div className="py-4">
        <h1 className="text-xl font-bold text-center mb-4">حسابي</h1>
        
        {userInfo ? (
          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-white rounded-lg p-4 flex items-center">
              <div className="bg-primary bg-opacity-10 p-3 rounded-full ml-3">
                <User size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="font-bold">{userInfo.name}</h2>
                <p className="text-sm text-gray-500">{userInfo.phone}</p>
              </div>
              <Link to="/account/edit" className="mr-auto text-primary text-sm">
                تعديل
              </Link>
            </div>
            
            {/* User Address */}
            {userInfo.address && (
              <div className="bg-white rounded-lg p-4 flex items-start">
                <div className="bg-primary bg-opacity-10 p-3 rounded-full ml-3 mt-1">
                  <MapPin size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold mb-1">عنوان التوصيل</h2>
                  <p className="text-sm text-gray-500">{userInfo.address}</p>
                </div>
                <Link to="/account/address" className="text-primary text-sm">
                  تعديل
                </Link>
              </div>
            )}
            
            {/* Menu Items */}
            <div className="bg-white rounded-lg overflow-hidden">
              <Link to="/orders" className="flex items-center justify-between p-4 border-b">
                <ChevronLeft size={20} className="text-gray-400" />
                <div className="flex items-center">
                  <span className="mr-3">طلباتي</span>
                  <ShoppingBag size={20} className="text-primary" />
                </div>
              </Link>
              
              <Link to="/about" className="flex items-center justify-between p-4 border-b">
                <ChevronLeft size={20} className="text-gray-400" />
                <div className="flex items-center">
                  <span className="mr-3">عن التطبيق</span>
                  <Info size={20} className="text-primary" />
                </div>
              </Link>
              
              <button 
                onClick={handleLogout}
                className="flex items-center justify-between p-4 w-full text-right"
              >
                <ChevronLeft size={20} className="text-gray-400" />
                <div className="flex items-center">
                  <span className="mr-3 text-red-500">تسجيل الخروج</span>
                  <LogOut size={20} className="text-red-500" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 bg-white rounded-lg">
              <div className="bg-primary bg-opacity-10 p-4 rounded-full mb-4">
                <User size={32} className="text-primary" />
              </div>
              <h2 className="text-lg font-bold mb-2">مرحباً بك</h2>
              <p className="text-sm text-gray-500 mb-6 text-center px-4">
                قم بتسجيل بياناتك لمتابعة طلباتك وحفظ عناوين التوصيل
              </p>
              <Link 
                to="/account/register" 
                className="bg-primary text-white px-6 py-2 rounded-lg"
              >
                تسجيل البيانات
              </Link>
            </div>
            
            {/* Help Links */}
            <div className="bg-white rounded-lg overflow-hidden">
              <Link to="/about" className="flex items-center justify-between p-4">
                <ChevronLeft size={20} className="text-gray-400" />
                <div className="flex items-center">
                  <span className="mr-3">عن التطبيق</span>
                  <Info size={20} className="text-primary" />
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Account;
