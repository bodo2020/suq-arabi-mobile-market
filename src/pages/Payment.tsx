import React, { useState, useEffect, useRef } from 'react';
import BrandLoader from '@/components/ui/BrandLoader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/contexts/UserContext';
import { Copy, CheckCheck, MapPin, CreditCard, ShoppingCart, Wallet, DollarSign, ArrowRight } from 'lucide-react';
import SwipeButton from '@/components/ui/SwipeButton';
import AddressDisplay from '@/components/ui/AddressDisplay';
import AddressSelector from '@/components/ui/AddressSelector';
import OrderNotes from '@/components/ui/OrderNotes';
import { useQuery } from '@tanstack/react-query';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const { items, getTotalPrice, clearCart, isInitialized, syncError, isSaving } = useCart();
  const { toast } = useToast();
  const { user, authLoading } = useUser();
  const submitting = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [discount, setDiscount] = useState(0);
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [isFreeDelivery, setIsFreeDelivery] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);
  const [notes, setNotes] = useState('');

  const formatProductName = (item: CartItem) => {
    if (item.is_bulk && item.product.bulk_quantity) {
      return `${item.product.name} *${item.product.bulk_quantity} قطعة`;
    }
    return item.product.name;
  };

  const { data: customerData, isFetching: customerLoading, error: customerError } = useQuery({
    queryKey: ['customerData', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: customer, error: profileError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      const { data: address, error: addressError } = await supabase
        .from('customer_addresses')
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();
      if (addressError) throw addressError;

      return {
        ...customer,
        default_address: address
      };
    },
    enabled: !!user?.id
  });

  const { data: deliveryPricing, isFetching: pricingLoading, error: pricingError } = useQuery({
    queryKey: ['deliveryPricing', customerData?.default_address],
    queryFn: async () => {
      if (!customerData?.default_address) return null;

      const locationId = customerData.default_address.neighborhood_id || 
                        customerData.default_address.area_id || 
                        customerData.default_address.city_id || 
                        customerData.default_address.governorate_id;
      
      if (!locationId) return null;
      const { data, error } = await supabase
        .from('delivery_type_pricing')
        .select('*')
        .eq('delivery_location_id', locationId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerData?.default_address && !!user
  });

  useEffect(() => {
    setDeliveryPrice(deliveryPricing?.price ?? 0);
  }, [deliveryPricing]);

  useEffect(() => {
    let active = true;
    const checkFreeDelivery = async () => {
      const subtotal = getTotalPrice();
      const freeDeliveryOffer = await getFreeDeliveryOffer(subtotal);
      if (!active) return;
      setIsFreeDelivery(false);
      if (freeDeliveryOffer) {
        const threshold = freeDeliveryOffer.min_order_amount;
        const progress = subtotal / threshold * 100;
        setIsFreeDelivery(progress >= 100);
      }
    };
    checkFreeDelivery();
    return () => { active = false; };
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
    if (submitting.current || authLoading || !isInitialized || isSaving) return;
    if (!user) { navigate('/phone-verify?returnTo=%2Fpayment'); return; }
    if (customerLoading || customerError) {
      toast({ title: 'تعذر تحميل بيانات الحساب', description: 'انتظر التحميل أو أعد المحاولة.' });
      return;
    }
    if (!customerData?.id || !customerData.name?.trim() || customerData.name.trim().length < 2) { navigate('/register?returnTo=%2Fpayment'); return; }
    if (!customerData.default_address) { navigate('/addresses?returnTo=%2Fpayment'); return; }
    if (syncError || customerLoading || customerError || pricingLoading || pricingError || !deliveryPricing) {
      toast({ title: 'تعذر تأكيد الطلب', description: 'انتظر تحميل السلة والعنوان ورسوم التوصيل، ثم أعد المحاولة.', variant: 'destructive' });
      return;
    }
    if (items.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "يرجى إضافة منتجات إلى سلة التسوق أولاً",
        variant: "destructive"
      });
      return;
    }

    // Check address
    if (!customerData?.default_address && !getSelectedAddress()) {
      toast({
        title: "العنوان مطلوب",
        description: "يرجى إضافة عنوان للتوصيل",
        variant: "destructive"
      });
      return;
    }

    submitting.current = true;
    setIsLoading(true);

    try {
      const customerId = customerData.id;
      const selectedAddress = getSelectedAddress();
      
      const orderData = {
        id: requestId.current,
        tracking_number: orderNumber,
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
            price: item.is_bulk ? item.product.bulk_price : (item.product.offer_price || item.product.price),
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
        shipping_address: customerData?.default_address?.address || selectedAddress?.address,
        notes: notes,
        delivery_location_id: customerData?.default_address?.neighborhood_id || 
                           customerData?.default_address?.area_id || 
                           customerData?.default_address?.city_id || 
                           customerData?.default_address?.governorate_id ||
                           selectedAddress?.neighborhood_id
      };



      let { data, error } = await supabase.from('online_orders').insert([orderData]).select();
      if (error?.code === '23505') {
        const existing = await supabase.from('online_orders').select('*').eq('id', requestId.current).eq('customer_id', customerId);
        if (!existing.error && existing.data?.length === 1) { data = existing.data; error = null; }
      }
      
      if (error) {
        console.error("Order submission error:", error);
        throw error;
      }

      if (!data?.length) throw new Error('Order was not returned');
      setWalletDialogOpen(false);
      
      clearCart();
      navigate('/order-success', {
        state: {
          orderId: data[0].id,
          orderNumber: data[0].tracking_number || orderNumber
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
      submitting.current = false;
      setIsLoading(false);
    }
  };

  const confirmWalletOrder = handleSubmitOrder;

  const getSelectedAddress = () => customerData?.default_address || null;

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

  if (authLoading || !isInitialized) return <CheckoutLayout step={2}><div className="flex justify-center py-20"><BrandLoader size="lg" /></div></CheckoutLayout>;

  if (items.length === 0) {
    return (
      <CheckoutLayout step={2}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">السلة فارغة</h2>
              <p className="text-muted-foreground mb-4">لا توجد منتجات في سلة التسوق</p>
              <Button onClick={() => navigate('/')}>
                تصفح المنتجات
              </Button>
            </CardContent>
          </Card>
        </div>
      </CheckoutLayout>
    );
  }
  
  return (
    <CheckoutLayout step={2}>
      <h1 className="checkout-title">آخر خطوة، وطلبك عندنا.</h1>
      <p className="checkout-intro">راجع عنوانك، اختار طريقة الدفع، وأكّد طلبك.</p>
      <div className="checkout-payment">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  عنوان التوصيل
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customerData?.default_address ? (
                  <div className="space-y-2">
                    <AddressDisplay
                      address={customerData.default_address.address || ''}
                      areaName={customerData.default_address.areas?.name || undefined}
                      neighborhoodName={customerData.default_address.neighborhoods?.name || undefined}
                      onEdit={() => navigate('/addresses?returnTo=%2Fpayment')}
                    />
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      العنوان الافتراضي للتوصيل
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    {user ? (
                      <>
                        <p className="text-muted-foreground mb-4">لا يوجد عنوان للتوصيل</p>
                        <Button 
                          variant="outline" 
                          onClick={() => navigate('/addresses?returnTo=%2Fpayment')}
                        >
                          إضافة عنوان جديد
                        </Button>
                      </>
                    ) : (
                      <AddressSelector onAddressSelect={(addressData) => {
                        setDeliveryPrice(addressData.delivery_price || 0);
                        toast({
                          title: "تم تحديد العنوان",
                          description: "تم تحديد عنوان التوصيل بنجاح"
                        });
                      }}>
                        <Button className="w-full">
                          اختر عنوان التوصيل
                        </Button>
                      </AddressSelector>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  طريقة الدفع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="space-y-4"
                >
                  <div className="flex items-start space-x-3 space-x-reverse p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="cash" id="cash" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="cash" className="font-medium cursor-pointer flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        الدفع عند الاستلام
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        ادفع نقداً عند وصول طلبك
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 space-x-reverse p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="wallet" id="wallet" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="wallet" className="font-medium cursor-pointer flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        المحفظة الإلكترونية
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        فودافون كاش أو انستا باي
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Order Notes */}
            <Card>
              <CardHeader>
                <CardTitle>ملاحظة للطلب <span className="text-sm font-normal text-muted-foreground">(اختياري)</span></CardTitle>
              </CardHeader>
              <CardContent>
                <OrderNotes value={notes} onChange={setNotes} />
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  ملخص الطلب
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>رقم الطلب:</span>
                  <Badge variant="secondary">{orderNumber}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Items */}
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={`${item.product.id}-${item.is_bulk ? 'bulk' : 'regular'}`} className="flex justify-between items-center py-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">{formatQuantity(item)} ×</span>
                          <span className="font-medium text-sm">
                            {formatProductName(item)}
                          </span>
                        </div>
                      </div>
                      <span className="font-medium">{getItemTotal(item).toFixed(2)} ج.م</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع</span>
                    <span className="font-bold">{getTotalPrice().toFixed(2)} ج.م</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>الخصم</span>
                      <span>- {discount.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>التوصيل</span>
                    <span className="font-bold">
                      {!deliveryPricing || pricingLoading ? <span className="text-muted-foreground">بعد تحديد العنوان</span> : isFreeDelivery ? (
                        <span className="text-green-600">مجاناً</span>
                      ) : (
                        `${deliveryPrice.toFixed(2)} ج.م`
                      )}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>الإجمالي</span>
                    <span className="text-primary">
                      {!deliveryPricing || pricingLoading ? '—' : `${(getTotalPrice() - discount + (isFreeDelivery ? 0 : deliveryPrice)).toFixed(2)} ج.م`}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  {(customerError || pricingError || syncError) && <p role="alert" className="mb-3 text-sm text-red-700">تعذر تحميل بيانات الطلب. راجع اتصالك وأعد فتح الصفحة.</p>}
                  {!pricingLoading && customerData?.default_address && !deliveryPricing && <p role="alert" className="mb-3 text-sm text-red-700">التوصيل غير متاح لهذا العنوان حاليًا. اختر عنوانًا آخر.</p>}
                  <SwipeButton 
                    completeText="تأكيد الطلب"
                    onComplete={paymentMethod === 'wallet' ? () => {
                      if (!user) { navigate('/phone-verify?returnTo=%2Fpayment'); return; }
                      if (!customerData?.name?.trim() || customerData.name.trim().length < 2) { navigate('/register?returnTo=%2Fpayment'); return; }
                      if (!customerData?.default_address) { navigate('/addresses?returnTo=%2Fpayment'); return; }
                      if (!deliveryPricing || pricingError || syncError) return;
                      setWalletDialogOpen(true);
                    } : handleSubmitOrder}
                    isLoading={isLoading || customerLoading || pricingLoading || isSaving}
                    className="w-full checkout-submit"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Wallet Payment Dialog */}
      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">تحويل المبلغ عبر المحفظة الإلكترونية</DialogTitle>
            <DialogDescription className="text-center">
              يرجى اتباع الخطوات التالية لإتمام الدفع
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card>
              <CardContent className="text-center p-4">
                <p className="mb-2">المبلغ المطلوب:</p>
                <p className="text-2xl font-bold text-primary">
                  {(getTotalPrice() - discount + (isFreeDelivery ? 0 : deliveryPrice)).toFixed(2)} ج.م
                </p>
              </CardContent>
            </Card>
            
            <div className="space-y-3">
              <p className="text-sm">قم بتحويل المبلغ عبر فودافون كاش أو انستا باي إلى:</p>
              
              <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                <span className="font-mono font-bold text-lg">{WALLET_PHONE_NUMBER}</span>
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
            
            <div className="space-y-3">
              <p className="text-sm">أرسل رسالة على نفس الرقم تحتوي على:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>رقم الطلب</li>
                <li>لقطة شاشة تؤكد الدفع</li>
              </ul>
              
              <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
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
            
            <Button 
              onClick={confirmWalletOrder} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "جاري تأكيد الطلب..." : "تأكيد الطلب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CheckoutLayout>
  );
};

export default Payment;

