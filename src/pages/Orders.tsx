
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Package, Home, ShoppingCart, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
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
    case 'waiting':
      return 'bg-amber-100 text-amber-800';
    case 'ready':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'done':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to get status text in Arabic
const getStatusText = (status: string) => {
  switch (status) {
    case 'waiting':
      return 'قيد الانتظار';
    case 'ready':
      return 'جاهز للشحن';
    case 'shipped':
      return 'تم الشحن';
    case 'done':
      return 'تم التسليم';
    default:
      return 'غير معروف';
  }
};
const Orders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const {
    data: orders,
    isLoading
  } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('online_orders').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data;
    }
  });
  const currentOrders = orders?.filter(order => ['waiting', 'ready'].includes(order.status)) || [];
  const previousOrders = orders?.filter(order => ['shipped', 'done'].includes(order.status)) || [];
  const activeOrders = activeTab === 'current' ? currentOrders : previousOrders;
  
  // Check if return is available for an order (only for completed orders)
  const canReturnOrder = (order: any) => {
    return order.status === 'done';
  };
  
  return <MainLayout>
      <div className="py-4 px-4 max-w-lg mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2" aria-label="الرجوع">
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold flex-1 text-center">طلباتي</h1>
          <div className="w-10"></div>
        </div>

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

        {isLoading ? <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                                <img src={item.image_url} alt={item.name || "منتج"} className="w-full h-full object-cover rounded" />
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
                                <img src={item.image_url} alt={item.name || "منتج"} className="w-full h-full object-cover rounded" />
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
