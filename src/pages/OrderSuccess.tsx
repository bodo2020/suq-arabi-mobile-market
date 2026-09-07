
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Home, ShoppingBag, Copy, CheckCheck } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  
  const { orderId, orderNumber } = location.state || {};
  
  const copyOrderNumber = () => {
    if (orderNumber) {
      navigator.clipboard.writeText(orderNumber)
        .then(() => {
          setCopied(true);
          toast({
            title: "تم النسخ",
            description: "تم نسخ رقم الطلب بنجاح"
          });
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          toast({
            title: "خطأ",
            description: "تعذر نسخ رقم الطلب",
            variant: "destructive"
          });
        });
    }
  };
  
  return (
    <MainLayout>
      <div className="py-4 h-[80vh] flex flex-col items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg p-6 shadow-sm text-center w-full max-w-sm animate-scale-in">
          <div className="flex justify-center mb-4 animate-[bounce_1s_ease-in-out_infinite]">
            <CheckCircle size={64} className="text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2 animate-fade-in">تم تأكيد طلبك</h1>
          <p className="text-gray-600 mb-3 animate-fade-in">
            سنقوم بإرسال تفاصيل طلبك ومتابعة الحالة عبر رقم الهاتف
          </p>
          
          {orderNumber && (
            <div className="flex items-center justify-center gap-2 mb-4 bg-muted p-2 rounded-md">
              <span className="font-mono font-medium">رقم الطلب: {orderNumber}</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={copyOrderNumber}
                className="h-8 w-8 p-0"
              >
                {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
          
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

