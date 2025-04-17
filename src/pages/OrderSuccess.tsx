
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home, ShoppingBag } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const OrderSuccess = () => {
  const navigate = useNavigate();
  
  return (
    <MainLayout>
      <div className="py-4 h-[80vh] flex flex-col items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-sm text-center w-full max-w-sm">
          <div className="flex justify-center mb-4">
            <CheckCircle size={64} className="text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">تم تأكيد طلبك</h1>
          <p className="text-gray-600 mb-6">
            سنقوم بإرسال تفاصيل طلبك ومتابعة الحالة عبر رقم الهاتف
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
            >
              <ShoppingBag size={18} className="ml-2" />
              متابعة طلباتي
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg flex items-center justify-center"
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
