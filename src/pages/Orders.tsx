
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Package, Home, ShoppingCart } from 'lucide-react';
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

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('online_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const currentOrders = orders?.filter(order => 
    ['waiting', 'ready'].includes(order.status)
  ) || [];

  const previousOrders = orders?.filter(order => 
    ['shipped', 'done'].includes(order.status)
  ) || [];

  const activeOrders = activeTab === 'current' ? currentOrders : previousOrders;

  const formatProductName = (item: any) => {
    // Check if item has name property
    const productName = item.name || item.product_name || "منتج غير معروف";
    
    if (item.is_bulk && item.bulk_quantity) {
      return `${productName} *${item.bulk_quantity} قطعة`;
    }
    return productName;
  };

  return (
    <MainLayout>
      <div className="py-4 px-4 max-w-lg mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold flex-1 text-center">طلباتي</h1>
          <div className="w-10"></div>
        </div>

        <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'current'
                ? 'bg-white shadow text-primary'
                : 'text-gray-600'
            }`}
          >
            الطلبات الجارية
          </button>
          <button
            onClick={() => setActiveTab('previous')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'previous'
                ? 'bg-white shadow text-primary'
                : 'text-gray-600'
            }`}
          >
            {`الطلبات السابقة (${previousOrders.length})`}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <img 
              src="/lovable-uploads/70c85cf9-48b2-4caf-bc41-8b961f0ff758.png" 
              alt="No orders" 
              className="w-48 h-48 object-contain mb-6" 
            />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {activeTab === 'current' ? 'لا يوجد طلبات حالية' : 'لا يوجد طلبات سابقة'}
            </h3>
            <p className="text-gray-500 mb-8">
              ليس لديك طلبات حالية، تسوق الآن و تتبع طلباتك بسهولة
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 rounded-xl text-lg"
            >
              تسوق الآن
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm">
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
                  {order.shipping_address && (
                    <div className="mb-3">
                      <strong>العنوان:</strong> {order.shipping_address}
                    </div>
                  )}
                  <div>
                    <strong>المنتجات:</strong>
                    <ul className="space-y-2 mt-2">
                      {Array.isArray(order.items) ? 
                        order.items.map((item: any, index: number) => (
                          <li key={index} className="bg-gray-50 p-2 rounded flex items-center justify-between">
                            <div>
                              <div className="font-medium">{formatProductName(item)}</div>
                              <div className="text-gray-500 text-xs mt-1">
                                {item.quantity} قطعة × {item.price} ج.م
                              </div>
                            </div>
                            <div className="font-semibold">
                              {(item.quantity * item.price).toFixed(2)} ج.م
                            </div>
                          </li>
                        )) : 
                        typeof order.items === 'object' ?
                          Object.values(order.items).map((item: any, index: number) => (
                            <li key={index} className="bg-gray-50 p-2 rounded flex items-center justify-between">
                              <div>
                                <div className="font-medium">{formatProductName(item)}</div>
                                <div className="text-gray-500 text-xs mt-1">
                                  {item.quantity} قطعة × {item.price} ج.م
                                </div>
                              </div>
                              <div className="font-semibold">
                                {(item.quantity * item.price).toFixed(2)} ج.م
                              </div>
                            </li>
                          )) : 
                          <li>لا توجد منتجات</li>
                      }
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t flex justify-around items-center h-16">
          <button 
            onClick={() => navigate('/')}
            className="flex flex-col items-center space-y-1 flex-1 text-gray-600"
          >
            <Home className="h-6 w-6" />
            <span className="text-xs">الرئيسية</span>
          </button>
          <button className="flex flex-col items-center space-y-1 flex-1 text-red-600">
            <Package className="h-6 w-6" />
            <span className="text-xs">طلباتي</span>
          </button>
          <button 
            onClick={() => navigate('/cart')}
            className="flex flex-col items-center space-y-1 flex-1 text-gray-600"
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="text-xs">عربة التسوق</span>
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Orders;
