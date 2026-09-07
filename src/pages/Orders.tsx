import BrandLoader from '@/components/ui/BrandLoader';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Package, Home, ShoppingCart, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/contexts/UserContext';

type TabType = 'current' | 'previous';

// Helper function to format date
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'yyyy/MM/dd - HH:mm');
  } catch (error) {
    return 'تاريخ غير معروف';
  }
};

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to get status text in Arabic
const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'قيد الانتظار';
    case 'delivered':
      return 'تم التسليم';
    case 'cancelled':
      return 'ملغى';
    default:
      return 'غير معروف';
  }
};
const Orders = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, session } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('current');
  
  // Helper function to get customer ID from user ID
  const getCustomerId = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching customer ID:', error);
        return null;
      }
      return data?.id || null;
    } catch (error) {
      console.error('Exception in getCustomerId:', error);
      return null;
    }
  };

  const {
    data: orders,
    isLoading,
    error
  } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }
      
      const customerId = await getCustomerId(user.id);
      if (!customerId) {
        return [];
      }

      const { data, error } = await supabase
        .from('online_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });
  const currentOrders = orders?.filter(order => ['pending'].includes(order.status)) || [];
  const previousOrders = orders?.filter(order => ['delivered', 'cancelled'].includes(order.status)) || [];
  const activeOrders = activeTab === 'current' ? currentOrders : previousOrders;
  
  // Check if return is available for an order (only for completed orders)
  const canReturnOrder = (order: any) => {
    return order.status === 'delivered';
  };
  
  return <MainLayout>
      <TopNavBar 
        hideLogo={true}
        hideSearch={true}
        hideCart={true}
        pageTitle="طلباتي"
      />
      <div className={`py-4 px-4 max-w-lg mx-auto ${!isMobile ? 'mt-24' : 'mt-6'}`}>
        <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setActiveTab('current')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'current' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}>
            الطلبات الجارية
          </button>
          <button onClick={() => setActiveTab('previous')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}>
            {`الطلبات السابقة (${previousOrders.length})`}
          </button>
        </div>

        <Button 
          variant="outline" 
          className="mb-4 w-full"
          onClick={() => navigate('/return-requests')}
        >
          <RefreshCw className="ml-2 h-4 w-4" />
          عرض طلبات الإرجاع
        </Button>

        {!session ? <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              يرجى تسجيل الدخول
            </h3>
            <p className="text-gray-500 mb-8">
              قم بتسجيل الدخول لعرض طلباتك
            </p>
            <Button onClick={() => navigate('/phone-login')} className="w-full bg-primary hover:bg-primary/90 text-white py-6 rounded-xl text-lg">
              تسجيل الدخول
            </Button>
          </div> : isLoading ? <div className="flex justify-center items-center h-40">
            <BrandLoader size="md" className="" />
          </div> : error ? <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-xl font-bold text-red-600 mb-2">
              خطأ في تحميل الطلبات
            </h3>
            <p className="text-gray-500 mb-8">
              حدث خطأ أثناء تحميل طلباتك، يرجى المحاولة مرة أخرى
            </p>
            <Button onClick={() => window.location.reload()} className="w-full bg-primary hover:bg-primary/90 text-white py-6 rounded-xl text-lg">
              إعادة المحاولة
            </Button>
          </div> : activeOrders.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {activeTab === 'current' ? 'لا يوجد طلبات حالية' : 'لا يوجد طلبات سابقة'}
            </h3>
            <p className="text-gray-500 mb-8">
              ليس لديك طلبات حالية، تسوق الآن و تتبع طلباتك بسهولة
            </p>
            <Button onClick={() => navigate('/')} className="w-full bg-primary hover:bg-primary/90 text-white py-6 rounded-xl text-lg">
              تسوق الآن
            </Button>
          </div> : <div className="space-y-4">
            {activeOrders.map(order => <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </span>
                    <div className="font-semibold mt-1">
                      {order.total.toFixed(2)} ج.م
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {order.shipping_address && <div className="mb-3">
                      <strong>العنوان:</strong> {order.shipping_address}
                    </div>}
                  <div>
                    <strong>المنتجات:</strong>
                    <ul className="space-y-2 mt-2">
                      {Array.isArray(order.items) ? order.items.map((item: any, index: number) => <li key={index} className="bg-gray-50 p-2 rounded flex items-center gap-3">
                          <div className="relative w-16 h-16 shrink-0">
                            {item.image_url ? <>
                                <img src={item.image_url} alt={item.name || "منتج"} className="w-full h-full object-cover rounded" loading="lazy" decoding="async" />
                                {item.is_bulk && item.bulk_quantity && <div className="absolute top-0 right-0 bg-primary text-white text-xs px-1 rounded-bl">
                                    {item.bulk_quantity}
                                  </div>}
                              </> : <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                لا توجد صورة
                              </div>}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{item.name || "منتج"}</div>
                            <div className="text-gray-500 text-xs mt-1">
                              {item.quantity} {item.unit_of_measure === 'weight' ? 'كجم' : 'قطعة'} × {item.price} ج.م
                            </div>
                          </div>
                          <div className="font-semibold">
                            {(item.quantity * item.price).toFixed(2)} ج.م
                          </div>
                        </li>) : typeof order.items === 'object' ? Object.values(order.items).map((item: any, index: number) => <li key={index} className="bg-gray-50 p-2 rounded flex items-center gap-3">
                          <div className="relative w-16 h-16 shrink-0">
                            {item.image_url ? <>
                                <img src={item.image_url} alt={item.name || "منتج"} className="w-full h-full object-cover rounded" loading="lazy" decoding="async" />
                                {item.is_bulk && item.bulk_quantity && <div className="absolute top-0 right-0 bg-primary text-white text-xs px-1 rounded-bl">
                                    {item.bulk_quantity}
                                  </div>}
                              </> : <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                لا توجد صورة
                              </div>}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{item.name || "منتج"}</div>
                            <div className="text-gray-500 text-xs mt-1">
                              {item.quantity} {item.unit_of_measure === 'weight' ? 'كجم' : 'قطعة'} × {item.price} ج.م
                            </div>
                          </div>
                          <div className="font-semibold">
                            {(item.quantity * item.price).toFixed(2)} ج.م
                          </div>
                        </li>) : <li>لا توجد منتجات</li>}
                    </ul>
                  </div>
                </div>
                
                {canReturnOrder(order) && (
                  <div className="mt-4 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate(`/create-return/${order.id}`)}
                    >
                      <RefreshCw className="ml-2 h-4 w-4" />
                      طلب إرجاع
                    </Button>
                  </div>
                )}
              </div>)}
          </div>}
        
        
      </div>
    </MainLayout>;
};
export default Orders;

