import BrandLoader from '@/components/ui/BrandLoader';

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import ReturnRequestForm from '@/components/ui/ReturnRequestForm';

const CreateReturnRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const { user, session } = useUser();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  useEffect(() => {
    if (!session) {
      navigate('/phone-login');
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        
        if (!orderId) {
          throw new Error('رقم الطلب غير موجود');
        }
        
        // First get the customer record for the current user
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (customerError || !customer) {
          throw new Error('لم يتم العثور على بيانات العميل');
        }

        // Check if the order belongs to the current customer
        const { data: order, error: orderError } = await supabase
          .from('online_orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (orderError || !order || order.customer_id !== customer.id) {
          throw new Error('الطلب غير موجود أو ليس لديك صلاحية للوصول إليه');
        }
        
        setOrder(order);
        
        // Process order items
        let items = [];
        if (order.items) {
          if (Array.isArray(order.items)) {
            items = order.items;
          } else if (typeof order.items === 'object') {
            items = Object.values(order.items);
          }
        }
        
        setOrderItems(items);
        
      } catch (error) {
        console.error('Error fetching order:', error);
        toast({
          title: "خطأ في تحميل الطلب",
          description: typeof error === 'object' && error !== null && 'message' in error
            ? (error as Error).message
            : "حدث خطأ أثناء تحميل بيانات الطلب",
          variant: "destructive"
        });
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user, session, navigate, toast]);

  return (
    <MainLayout>
      <div className="py-4 px-4 max-w-lg mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2" aria-label="الرجوع">
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">إنشاء طلب إرجاع</h1>
          <div className="w-10"></div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <BrandLoader size="md" className="" />
          </div>
        ) : !order ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-bold mb-2">الطلب غير موجود</h2>
            <p className="text-gray-500">
              لم نتمكن من العثور على الطلب المطلوب
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
              <h2 className="font-bold text-lg mb-3">معلومات الطلب</h2>
              <div className="text-sm text-gray-600">
                <p><strong>رقم الطلب:</strong> {order.id.substring(0, 8)}</p>
                <p><strong>تاريخ الطلب:</strong> {new Date(order.created_at).toLocaleDateString('ar-EG')}</p>
                <p><strong>إجمالي الطلب:</strong> {order.total} ج.م</p>
              </div>
            </div>
            
            <ReturnRequestForm 
              orderId={order.id} 
              orderItems={orderItems}
              onSuccess={() => {
                toast({
                  title: "تم إرسال طلب الإرجاع",
                  description: "سنراجع طلبك والرد عليك في أقرب وقت"
                });
                navigate('/return-requests');
              }}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default CreateReturnRequest;

