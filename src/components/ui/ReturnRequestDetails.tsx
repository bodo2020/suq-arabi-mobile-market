
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getReturnRequestItems, ReturnRequest, ReturnRequestItem } from '@/lib/supabase';
import { ImageOff } from 'lucide-react';

interface ReturnRequestDetailsProps {
  request: ReturnRequest;
}

const ReturnRequestDetails: React.FC<ReturnRequestDetailsProps> = ({ request }) => {
  const [items, setItems] = useState<ReturnRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await getReturnRequestItems(request.id);
        setItems(data);
      } catch (error) {
        console.error('Error fetching return items:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchItems();
  }, [request.id]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd - HH:mm');
    } catch (error) {
      return 'تاريخ غير معروف';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'قيد المراجعة';
      case 'approved':
        return 'تمت الموافقة';
      case 'rejected':
        return 'تم الرفض';
      default:
        return 'غير معروف';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm text-gray-500">
            {formatDate(request.created_at)}
          </span>
          <h3 className="font-bold mt-1">
            طلب إرجاع #{request.id.substring(0, 8)}
          </h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(request.status)}`}>
          {getStatusText(request.status)}
        </span>
      </div>

      <div className="border-t pt-3 space-y-2">
        <div>
          <strong className="text-sm">سبب الإرجاع:</strong>
          <p className="mt-1 text-gray-700">{request.reason}</p>
        </div>

        {request.admin_notes && (
          <div className="mt-3">
            <strong className="text-sm">ملاحظات الإدارة:</strong>
            <p className="mt-1 text-gray-700 bg-gray-50 p-2 rounded">{request.admin_notes}</p>
          </div>
        )}

        {loading ? (
          <div className="py-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="mt-4">
            <strong className="text-sm">المنتجات المرتجعة:</strong>
            <ul className="mt-2 space-y-3">
              {items.map(item => (
                <li key={item.id} className="bg-gray-50 p-3 rounded">
                  <div className="flex items-center">
                    <div className="w-12 h-12 shrink-0 overflow-hidden rounded">
                      {item.products?.image_urls && item.products.image_urls.length > 0 ? (
                        <img 
                          src={item.products.image_urls[0]} 
                          alt={item.products?.name || "منتج"} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <ImageOff size={16} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="mr-3 flex-1">
                      <p className="font-medium">{item.products?.name || "منتج"}</p>
                      <p className="text-xs text-gray-500">
                        الكمية: {item.quantity}
                      </p>
                    </div>
                  </div>
                  {item.reason && (
                    <p className="mt-2 text-sm text-gray-600 border-t pt-2">
                      {item.reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {request.images && request.images.length > 0 && (
          <div className="mt-4">
            <strong className="text-sm">الصور المرفقة:</strong>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {request.images.map((image, index) => (
                <div 
                  key={index} 
                  className="h-16 rounded overflow-hidden cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <img 
                    src={image} 
                    alt={`صورة ${index + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-lg max-h-screen">
            <img 
              src={selectedImage} 
              alt="صورة مكبرة" 
              className="max-w-full max-h-[80vh] object-contain"
            />
            <button 
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnRequestDetails;
