
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createReturnRequest, uploadReturnImages } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { Camera, Upload, X, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReturnRequestFormProps {
  orderId: string;
  orderItems: any[];
  onSuccess?: () => void;
}

const ReturnRequestForm: React.FC<ReturnRequestFormProps> = ({ 
  orderId,
  orderItems,
  onSuccess
}) => {
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: boolean }>({});
  const [itemReasons, setItemReasons] = useState<{ [key: string]: string }>({});
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
    
    // Initialize quantity if the item is being selected for the first time
    if (!quantities[itemId]) {
      const item = orderItems.find(item => item.id === itemId || item.product_id === itemId);
      const initialQuantity = item?.quantity || 1;
      setQuantities(prev => ({
        ...prev,
        [itemId]: initialQuantity
      }));
    }
  };

  const handleQuantityChange = (itemId: string, value: number) => {
    const item = orderItems.find(item => item.id === itemId || item.product_id === itemId);
    const maxQuantity = item?.quantity || 1;
    
    if (value < 1) value = 1;
    if (value > maxQuantity) value = maxQuantity;
    
    setQuantities(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleItemReasonChange = (itemId: string, value: string) => {
    setItemReasons(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      
      setImages(prev => [...prev, ...newFiles]);
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      // Revoke the URL to prevent memory leaks
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول لإرسال طلب الإرجاع",
        variant: "destructive"
      });
      return;
    }
    
    const selectedItemIds = Object.entries(selectedItems)
      .filter(([_, isSelected]) => isSelected)
      .map(([id, _]) => id);
    
    if (selectedItemIds.length === 0) {
      toast({
        title: "لم يتم اختيار منتجات",
        description: "يرجى اختيار المنتجات التي تريد إرجاعها",
        variant: "destructive"
      });
      return;
    }
    
    if (!reason.trim()) {
      toast({
        title: "سبب الإرجاع مطلوب",
        description: "يرجى كتابة سبب طلب الإرجاع",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Upload images if any
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        uploadedImageUrls = await uploadReturnImages(images);
      }
      
      // Prepare items for the return request
      const returnItems = selectedItemIds.map(id => {
        const itemId = orderItems.find(item => 
          item.id === id || item.product_id === id
        )?.product_id || id;
        
        return {
          productId: itemId,
          quantity: quantities[id] || 1,
          reason: itemReasons[id] || ''
        };
      });
      
      // Create the return request
      await createReturnRequest(
        user.id,
        orderId,
        reason,
        returnItems,
        uploadedImageUrls
      );
      
      toast({
        title: "تم إرسال طلب الإرجاع",
        description: "سنقوم بمراجعة طلبك والرد عليك في أقرب وقت"
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/orders');
      }
      
    } catch (error) {
      console.error('Error submitting return request:', error);
      toast({
        title: "حدث خطأ",
        description: "لم نتمكن من إرسال طلب الإرجاع، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="font-bold text-lg mb-3">المنتجات للإرجاع</h3>
        
        <div className="space-y-3">
          {orderItems.map(item => {
            const itemId = item.id || item.product_id;
            const name = item.name || (item.product && item.product.name) || "منتج";
            const imageUrl = item.image_url || (item.image_urls && item.image_urls[0]) || "/placeholder.svg";
            
            return (
              <div key={itemId} className="flex items-start space-x-3 space-x-reverse p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id={`item-${itemId}`}
                  className="h-5 w-5 mt-1 text-primary"
                  checked={!!selectedItems[itemId]}
                  onChange={() => handleItemSelect(itemId)}
                />
                
                <div className="w-16 h-16 shrink-0">
                  <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded" />
                </div>
                
                <div className="flex-1 mr-3 space-y-2">
                  <label htmlFor={`item-${itemId}`} className="font-medium block">{name}</label>
                  
                  {selectedItems[itemId] && (
                    <>
                      <div className="flex items-center mt-2">
                        <span className="text-sm ml-2">الكمية:</span>
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center text-sm border rounded-full"
                          onClick={() => handleQuantityChange(itemId, (quantities[itemId] || 1) - 1)}
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{quantities[itemId] || 1}</span>
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center text-sm border rounded-full"
                          onClick={() => handleQuantityChange(itemId, (quantities[itemId] || 1) + 1)}
                        >
                          +
                        </button>
                      </div>
                      
                      <div className="mt-2">
                        <Textarea
                          placeholder="سبب إرجاع هذا المنتج (اختياري)"
                          className="text-sm resize-none"
                          rows={2}
                          value={itemReasons[itemId] || ''}
                          onChange={(e) => handleItemReasonChange(itemId, e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="font-bold text-lg mb-3">سبب الإرجاع</h3>
        <Textarea
          placeholder="يرجى كتابة سبب طلب الإرجاع..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full resize-none"
          rows={4}
        />
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="font-bold text-lg mb-3">صور المنتجات (اختياري)</h3>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative h-24">
              <img 
                src={preview} 
                alt={`صورة ${index + 1}`} 
                className="w-full h-full object-cover rounded"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          
          {previews.length < 6 && (
            <label className="border-2 border-dashed border-gray-300 h-24 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
              <Plus size={24} className="text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">إضافة صورة</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                multiple
              />
            </label>
          )}
        </div>
        
        <p className="text-xs text-gray-500">
          يمكنك إضافة حتى 6 صور للمنتجات المرتجعة. الصور تساعد في تسريع عملية الموافقة.
        </p>
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            جاري الإرسال...
          </span>
        ) : (
          'إرسال طلب الإرجاع'
        )}
      </Button>
    </form>
  );
};

export default ReturnRequestForm;
