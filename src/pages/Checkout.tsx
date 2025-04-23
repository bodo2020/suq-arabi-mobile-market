import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, User, Phone, Check, Gift } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/contexts/useCart';
import { submitOrder, supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { applyCoupon, getApplicableOffers, getFreeDeliveryOffer } from '@/utils/offerUtils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import DeliveryTypeSelector from '@/components/DeliveryTypeSelector';
import { getDeliveryTypes, getDeliveryPrice } from '@/utils/deliveryUtils';
import LocationPicker from '@/components/ui/LocationPicker';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [deliveryTypes, setDeliveryTypes] = useState<any[]>([]);
  const [selectedDeliveryType, setSelectedDeliveryType] = useState('');
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [deliveryPrices, setDeliveryPrices] = useState<{[key: string]: number}>({});
  const [freeDeliveryOffer, setFreeDeliveryOffer] = useState<any>(null);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (customerData) {
          setName(customerData.name);
          setPhone(customerData.phone || '');
        } else {
          navigate('/account/address');
          return;
        }

        const { data: addressData } = await supabase
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
          .single();

        if (addressData) {
          setAddress(addressData);
        } else {
          navigate('/account/address');
          return;
        }
      } else {
        navigate('/account/register');
        return;
      }
    };
    
    const loadOffers = async () => {
      const offers = await getApplicableOffers(getTotalPrice());
      setAvailableOffers(offers);
    };

    const loadDeliveryTypes = async () => {
      const types = await getDeliveryTypes();
      setDeliveryTypes(types);
      if (types.length > 0 && !selectedDeliveryType) {
        setSelectedDeliveryType(types[0].id);
      }
    };

    const loadFreeDeliveryOffer = async () => {
      const offer = await getFreeDeliveryOffer(getTotalPrice());
      setFreeDeliveryOffer(offer);
    };

    loadUserData();
    loadOffers();
    loadDeliveryTypes();
    loadFreeDeliveryOffer();
  }, [items.length, navigate, getTotalPrice]);

  useEffect(() => {
    const updateDeliveryPrices = async () => {
      if (address?.neighborhood_id) {
        const newDeliveryPrices: {[key: string]: number} = {};
        
        for (const type of deliveryTypes) {
          let price = await getDeliveryPrice(type.id, address.neighborhood_id);
          
          if (freeDeliveryOffer && getTotalPrice() >= freeDeliveryOffer.min_order_amount) {
            price = 0;
          }
          
          newDeliveryPrices[type.id] = price;
        }
        
        setDeliveryPrices(newDeliveryPrices);
        
        if (selectedDeliveryType) {
          setDeliveryPrice(newDeliveryPrices[selectedDeliveryType] || 0);
        }
      }
    };
    
    if (deliveryTypes.length > 0 && address?.neighborhood_id) {
      updateDeliveryPrices();
    }
  }, [deliveryTypes, address, selectedDeliveryType, freeDeliveryOffer, getTotalPrice]);

  const handleBack = () => {
    navigate(-1);
  };

  const validate = () => {
    const newErrors = {
      name: '',
      phone: '',
      address: '',
    };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'الاسم مطلوب';
      isValid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
      isValid = false;
    } else if (!/^\d{10,11}$/.test(phone.trim())) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
      isValid = false;
    }

    if (!address) {
      newErrors.address = 'العنوان مطلوب';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    
    setIsApplyingCoupon(true);
    try {
      const { offer, discount } = await applyCoupon(couponCode, getTotalPrice());
      setAppliedOffer(offer);
      setDiscount(discount);
      toast.success('تم تطبيق كود الخصم بنجاح');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!selectedDeliveryType) {
      toast.error('يرجى اختيار طريقة التوصيل');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedAddress = `${address.address}, ${address.neighborhoods?.name || ''}, ${address.areas?.name || ''}, ${address.cities?.name || ''}, ${address.governorates?.name || ''}`;

      const orderData = {
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.offer_price || item.product.price,
          name: item.product.name,
        })),
        total: getTotalPrice() - discount + deliveryPrice,
        shipping_address: formattedAddress,
        shipping_cost: deliveryPrice,
        payment_method: paymentMethod,
        payment_status: "pending" as const,
        status: "waiting" as const,
        notes: `Customer Name: ${name}\nPhone: ${phone}${appliedOffer ? `\nApplied Offer: ${appliedOffer.name}` : ''}`,
      };

      await submitOrder(orderData);
      
      if (appliedOffer) {
        await supabase.from('coupon_usage').insert({
          offer_id: appliedOffer.id,
          user_id: null,
        });
      }
      
      clearCart();
      toast.success('تم تأكيد طلبك بنجاح');
      navigate('/order-success');
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductImage = (item) => {
    return item.product.image_urls && item.product.image_urls.length > 0 
      ? item.product.image_urls[0] 
      : '/placeholder.svg';
  };

  const subtotal = getTotalPrice();
  const deliveryFee = 0;
  const total = subtotal + deliveryFee - discount + deliveryPrice;

  const handleDeliveryTypeChange = (deliveryTypeId: string) => {
    setSelectedDeliveryType(deliveryTypeId);
    setDeliveryPrice(deliveryPrices[deliveryTypeId] || 0);
  };

  return (
    <MainLayout>
      <div className="py-4 pb-24" dir="rtl">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">إتمام الطلب</h1>
          <div className="w-10"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-bold text-lg mb-4">معلومات التوصيل</h2>
            
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label className="font-medium">الاسم</label>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                {name}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Phone size={18} className="ml-2 text-gray-500" />
                <label className="font-medium">رقم الهاتف</label>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                {phone}
              </div>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label className="font-medium">العنوان</label>
              </div>
              {address && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold mb-1">
                    {address.governorates?.name && `${address.governorates.name}، `}
                    {address.cities?.name && `${address.cities.name}، `}
                    {address.areas?.name && `${address.areas.name}، `}
                    {address.neighborhoods?.name && address.neighborhoods.name}
                  </p>
                  <p className="text-sm text-gray-600">{address.address}</p>
                </div>
              )}
              {!address && (
                <Button 
                  type="button" 
                  onClick={() => navigate('/account/address')}
                  className="w-full"
                >
                  إضافة عنوان للتوصيل
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <DeliveryTypeSelector
              options={deliveryTypes.map(type => ({
                ...type,
                price: deliveryPrices[type.id] || 0
              }))}
              selectedId={selectedDeliveryType}
              onSelect={handleDeliveryTypeChange}
            />
          </div>

          {availableOffers.length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h2 className="font-bold text-lg mb-4">العروض المتاحة</h2>
              <div className="space-y-3">
                {availableOffers.map(offer => (
                  <div key={offer.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Gift size={18} className="ml-2 text-primary" />
                    <div>
                      <p className="font-medium">{offer.name}</p>
                      <p className="text-sm text-gray-600">{offer.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg p-4">
            <h2 className="font-bold text-lg mb-4">كود الخصم</h2>
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="أدخل كود الخصم"
                className="text-right"
              />
              <Button 
                onClick={handleApplyCoupon}
                disabled={isApplyingCoupon || !couponCode}
                variant="secondary"
              >
                تطبيق
              </Button>
            </div>
            {appliedOffer && (
              <div className="mt-2 text-primary flex items-center">
                <Check size={16} className="ml-1" />
                <span>تم تطبيق كود الخصم</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-4">
            <h2 className="font-bold text-lg mb-4">ملخص الطلب</h2>
            
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center">
                    <span className="text-gray-500 ml-1">{item.quantity} ×</span>
                    <span className="font-medium">{item.product.name}</span>
                  </div>
                  <span>{((item.product.offer_price || item.product.price) * item.quantity).toFixed(2)} ج.م</span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">المجموع</span>
                <span className="font-medium">{subtotal.toFixed(2)} ج.م</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>الخصم</span>
                  <span className="font-medium">- {discount.toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">رسوم التوصيل</span>
                <span className="font-medium">{deliveryPrice.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">الإجمالي</span>
                <span className="font-bold text-lg">{(subtotal - discount + deliveryPrice).toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h2 className="font-bold text-lg mb-4">طريقة الدفع</h2>
            
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="bg-primary h-5 w-5 rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
              <div className="flex items-center">
                <span className="mr-2">الدفع عند الاستلام</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <rect width="20" height="12" x="2" y="6" rx="2"></rect>
                  <circle cx="12" cy="12" r="2"></circle>
                  <path d="M6 12h.01M18 12h.01"></path>
                </svg>
              </div>
            </div>
          </div>

          <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t">
            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>تأكيد الطلب</span>
                  <span className="mr-2">{(getTotalPrice() - discount + deliveryPrice).toFixed(2)} ج.م</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default Checkout;
