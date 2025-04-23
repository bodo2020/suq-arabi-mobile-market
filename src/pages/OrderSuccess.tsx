
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home, ShoppingBag } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const OrderSuccess = () => {
  const navigate = useNavigate();
  
  return (
    <MainLayout>
      <div className="py-4 h-[80vh] flex flex-col items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg p-6 shadow-sm text-center w-full max-w-sm animate-scale-in">
          <div className="flex justify-center mb-4 animate-[bounce_1s_ease-in-out_infinite]">
            <CheckCircle size={64} className="text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2 animate-fade-in">تم تأكيد طلبك</h1>
          <p className="text-gray-600 mb-6 animate-fade-in">
            سنقوم بإرسال تفاصيل طلبك ومتابعة الحالة عبر رقم الهاتف
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag size={18} className="ml-2" />
              متابعة طلباتي
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <Home size={18} className="ml-2" />
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default OrderSuccess;
