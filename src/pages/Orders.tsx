
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';

const Orders = () => {
  const navigate = useNavigate();

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-green-100 text-green-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'قيد الانتظار';
      case 'ready':
        return 'قيد التجهيز';
      case 'shipped':
        return 'تم الشحن';
      case 'done':
        return 'مكتمل';
      default:
        return status;
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy - HH:mm');
  };

  return (
    <MainLayout>
      <div className="py-4">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">طلباتي</h1>
          <div className="w-10"></div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package size={64} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-1">لا توجد طلبات</h3>
            <p className="text-sm text-gray-400">لم تقم بإجراء أي طلبات بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders?.map((order) => (
              <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </span>
                    <div className="font-semibold mt-1">
                      {order.total.toFixed(2)} ر.س
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="mb-1">
                    <strong>العنوان:</strong> {order.shipping_address}
                  </div>
                  <div>
                    <strong>المنتجات:</strong>
                    <ul className="list-disc list-inside mr-4 mt-1">
                      {Array.isArray(order.items) ? 
                        order.items.map((item: any, index: number) => (
                          <li key={index}>
                            {item.name} - {item.quantity} قطعة
                          </li>
                        )) : 
                        typeof order.items === 'object' ?
                          Object.values(order.items).map((item: any, index: number) => (
                            <li key={index}>
                              {item.name} - {item.quantity} قطعة
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
      </div>
    </MainLayout>
  );
};

export default Orders;
