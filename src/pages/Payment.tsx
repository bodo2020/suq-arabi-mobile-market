
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { Copy, CheckCheck } from 'lucide-react';
import SwipeButton from '@/components/ui/SwipeButton';
import AddressDisplay from '@/components/ui/AddressDisplay';
import { useQuery } from '@tanstack/react-query';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { getFreeDeliveryOffer } from '@/utils/offerUtils';
import { CartItem } from '@/contexts/cartTypes';

const WALLET_PHONE_NUMBER = "01005245096";

const Payment = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const { user } = useUser();
  
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [discount, setDiscount] = useState(0);
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [isFreeDelivery, setIsFreeDelivery] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

  const formatProductName = (item: CartItem) => {
    if (item.is_bulk && item.product.bulk_quantity) {
      return `${item.product.name} *${item.product.bulk_quantity} قطعة`;
    }
    return item.product.name;
  };

  const { data: customerData } = useQuery({
    queryKey: ['customerData', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: address } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      return {
        ...customer,
        default_address: address
      };
    },
    enabled: !!user?.id
  });

  // Remove delivery pricing query since we don't have location hierarchy anymore
  const deliveryPricing = { price: 20 }; // Default delivery price

  useEffect(() => {
    if (deliveryPricing?.price !== undefined) {
      setDeliveryPrice(deliveryPricing.price);
    }
  }, [deliveryPricing]);

  useEffect(() => {
    const checkFreeDelivery = async () => {
      const subtotal = getTotalPrice();
      const freeDeliveryOffer = await getFreeDeliveryOffer(subtotal);
      if (freeDeliveryOffer) {
        const threshold = freeDeliveryOffer.min_order_amount;
        const progress = subtotal / threshold * 100;
        setIsFreeDelivery(progress >= 100);
      }
    };
    checkFreeDelivery();
  }, [getTotalPrice]);
  
  useEffect(() => {
    const generateOrderNumber = () => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      return `${year}${month}${day}-${random}`;
    };
    
    setOrderNumber(generateOrderNumber());
  }, []);

  const handleSubmitOrder = async () => {
    if (items.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "يرجى إضافة منتجات إلى سلة التسوق أولاً",
        variant: "destructive"
      });
      return;
    }

    if (!customerData?.default_address) {
      toast({
        title: "العنوان مطلوب",
        description: "يرجى إضافة عنوان للتوصيل",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const customerId = user ? await getCustomerId() : null;
      
      const orderData = {
        items: items.map(item => {
          const quantity = item.unit_of_measure === 'weight' 
            ? item.quantity / 1000  // Convert grams to kilograms
            : item.quantity;

          return {
            product_id: item.product.id,
            barcode: item.is_bulk ? item.product.bulk_barcode : item.product.barcode,
            name: item.product.name,
            image_url: item.product.image_urls && item.product.image_urls.length > 0 ? item.product.image_urls[0] : null,
            quantity: quantity,
            price: item.product.offer_price || item.product.price,
            bulk_quantity: item.product.bulk_quantity,
            is_bulk: item.is_bulk,
            unit_of_measure: item.unit_of_measure,
            total: getItemTotal(item)
          };
        }),
        total: getTotalPrice() + (isFreeDelivery ? 0 : deliveryPrice) - discount,
        shipping_cost: isFreeDelivery ? 0 : deliveryPrice,
        payment_method: paymentMethod,
        customer_id: customerId,
        shipping_address: customerData?.default_address.address,
        notes: '',
        delivery_location_id: null // Removed reference to location hierarchy
      };

      console.log("Submitting order data:", orderData);

      const { data, error } = await supabase.from('online_orders').insert([orderData]).select();
      
      if (error) {
        console.error("Order submission error:", error);
        throw error;
      }

      console.log("Order created successfully:", data);
      
      clearCart();
      navigate('/order-success', {
        state: {
          orderId: data[0].id,
          orderNumber: orderNumber
        }
      });
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "حدث خطأ",
        description: "تعذر إكمال الطلب. يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmWalletOrder = async () => {
    setIsLoading(true);
    try {
      const customerId = user ? await getCustomerId() : null;
      
      const orderData = {
        items: items.map(item => {
          const quantity = item.unit_of_measure === 'weight' 
            ? item.quantity / 1000  // Convert grams to kilograms
            : item.quantity;

          return {
            product_id: item.product.id,
            barcode: item.is_bulk ? item.product.bulk_barcode : item.product.barcode,
            name: item.product.name,
            image_url: item.product.image_urls && item.product.image_urls.length > 0 ? item.product.image_urls[0] : null,
            quantity: quantity,
            price: item.product.offer_price || item.product.price,
            bulk_quantity: item.product.bulk_quantity,
            is_bulk: item.is_bulk,
            unit_of_measure: item.unit_of_measure,
            total: getItemTotal(item)
          };
        }),
        total: getTotalPrice() + (isFreeDelivery ? 0 : deliveryPrice) - discount,
        shipping_cost: isFreeDelivery ? 0 : deliveryPrice,
        payment_method: 'wallet',
        customer_id: customerId,
        shipping_address: customerData?.default_address.address,
        notes: '',
        delivery_location_id: null // Removed reference to location hierarchy
      };
      
      console.log("Submitting wallet order data:", orderData);

      const { data, error } = await supabase.from('online_orders').insert([orderData]).select();
      
      if (error) {
        console.error("Wallet order submission error:", error);
        throw error;
      }

      console.log("Wallet order created successfully:", data);
      
      setWalletDialogOpen(false);
      clearCart();
      navigate('/order-success', {
        state: {
          orderId: data[0].id,
          orderNumber: orderNumber
        }
      });
    } catch (error) {
      console.error('Error submitting wallet order:', error);
      toast({
        title: "حدث خطأ",
        description: "تعذر إكمال الطلب. يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerId = async () => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.from('customers').select('id').eq('user_id', user.id).single();
      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newCustomer, error: insertError } = await supabase.from('customers').insert([{
            user_id: user.id,
            first_name: customerData?.first_name || '',
            last_name: customerData?.last_name || '',
            email: customerData?.email || user.email || '',
            phone: customerData?.phone || '',
            address: customerData?.address || '',
            name: customerData?.name || `${customerData?.first_name || ''} ${customerData?.last_name || ''}`.trim()
          }]).select('id').single();
          
          if (insertError) throw insertError;
          return newCustomer.id;
        }
        throw error;
      }
      return data.id;
    } catch (error) {
      console.error('Error in getCustomerId:', error);
      return null;
    }
  };

  const getItemTotal = (item: CartItem) => {
    if (item.is_bulk) {
      return (item.product.bulk_price || 0) * item.quantity;
    }
    if (item.unit_of_measure === 'weight') {
      const pricePerKg = item.product.offer_price || item.product.price || 0;
      return pricePerKg * (item.quantity / 1000);
    }
    return (item.product.offer_price || item.product.price) * item.quantity;
  };

  const formatQuantity = (item: CartItem) => {
    if (item.unit_of_measure === 'weight') {
      const kgWeight = (item.quantity / 1000).toFixed(3);
      return `${kgWeight} كجم`;
    } else if (item.is_bulk) {
      const bulkQuantity = item.product.bulk_quantity || 1;
      return `${bulkQuantity * item.quantity}`;
    }
    return item.quantity;
  };

  const copyToClipboard = (text: string, type: 'phone' | 'order') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'phone') {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      } else {
        setCopiedOrderNumber(true);
        setTimeout(() => setCopiedOrderNumber(false), 2000);
      }
      
      toast({
        title: "تم النسخ",
        description: "تم نسخ النص إلى الحافظة"
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        title: "خطأ",
        description: "تعذر نسخ النص",
        variant: "destructive"
      });
    });
  };
  
  return (
    <MainLayout>
      <div className="py-4 pb-24" dir="rtl">
        <h1 className="text-xl font-bold text-center mb-4">الدفع وتأكيد الطلب</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4 order-2 md:order-1">
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-lg font-bold mb-3">عنوان التوصيل</h3>
              
              {customerData?.default_address ? (
                <AddressDisplay
                  address={customerData.default_address.address || ''}
                  onEdit={() => navigate('/address-manager')}
                />
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">لا يوجد عنوان للتوصيل</p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/address-manager')} 
                    className="text-primary border-primary hover:bg-primary/10"
                  >
                    إضافة عنوان جديد
                  </Button>
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-lg font-bold mb-3">طريقة الدفع</h3>
              
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="font-medium cursor-pointer">الدفع عند الاستلام</Label>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="wallet" id="wallet" />
                  <Label htmlFor="wallet" className="font-medium cursor-pointer">المحفظة الإلكترونية</Label>
                </div>
              </RadioGroup>
              
              <p className="text-sm text-muted-foreground mt-2">
                {paymentMethod === 'cash' 
                  ? 'سيتم الدفع نقداً عند استلام الطلب'
                  : 'الدفع المسبق عبر فودافون كاش أو انستا باي'
                }
              </p>
            </div>

            <SwipeButton 
              onComplete={paymentMethod === 'wallet' ? () => setWalletDialogOpen(true) : handleSubmitOrder}
              isLoading={isLoading}
              className="mt-8"
            />
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4 order-1 md:order-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">تفاصيل الطلب</h3>
              <span className="text-sm text-muted-foreground">رقم الطلب: {orderNumber}</span>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                السلة فارغة
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={`${item.product.id}-${item.is_bulk ? 'bulk' : 'regular'}`} className="flex justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center">
                        <span className="text-gray-500 ml-1">{formatQuantity(item)} ×</span>
                        <span className="font-medium">
                          {formatProductName(item)}
                        </span>
                      </div>
                      <span>{getItemTotal(item).toFixed(2)} ج.م</span>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span>المجموع</span>
                    <span className="font-bold">{getTotalPrice().toFixed(2)} ج.م</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between py-2 border-b text-primary">
                      <span>الخصم</span>
                      <span>- {discount.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between py-2 border-b">
                    <span>التوصيل</span>
                    <span className="font-bold">
                      {isFreeDelivery ? (
                        <span className="text-primary">مجاناً</span>
                      ) : (
                        `${deliveryPrice.toFixed(2)} ج.م`
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2 font-bold">
                    <span>الإجمالي</span>
                    <span className="text-lg">
                      {(getTotalPrice() - discount + (isFreeDelivery ? 0 : deliveryPrice)).toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">تحويل المبلغ عبر المحفظة الإلكترونية</DialogTitle>
            <DialogDescription className="text-center">
              يرجى اتباع الخطوات التالية لإتمام الدفع
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="mb-2 text-center">قم بتحويل المبلغ التالي:</p>
              <p className="text-xl font-bold text-center text-primary">
                {(getTotalPrice() - discount + (isFreeDelivery ? 0 : deliveryPrice)).toFixed(2)} ج.م
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm">قم بتحويل المبلغ عبر فودافون كاش أو انستا باي إلى الرقم التالي:</p>
              
              <div className="flex items-center justify-between bg-muted p-2 px-4 rounded-md">
                <span className="font-mono font-medium">{WALLET_PHONE_NUMBER}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(WALLET_PHONE_NUMBER, 'phone')}
                  className="h-8 w-8 p-0"
                >
                  {copiedPhone ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm">قم بإرسال رسالة على نفس الرقم تحتوي على:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>رقم الطلب</li>
                <li>لقطة شاشة تؤكد الدفع</li>
              </ul>
              
              <div className="flex items-center justify-between bg-muted p-2 px-4 rounded-md">
                <span className="font-mono font-medium">رقم الطلب: {orderNumber}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(orderNumber, 'order')}
                  className="h-8 w-8 p-0"
                >
                  {copiedOrderNumber ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={confirmWalletOrder} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "جاري تأكيد الطلب..." : "تأكيد الطلب"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Payment;
