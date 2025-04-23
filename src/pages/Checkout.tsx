import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, User, Phone, Check, Gift } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/contexts/useCart';
import { submitOrder, supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { applyCoupon, getApplicableOffers } from '@/utils/offerUtils';
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

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    const savedName = localStorage.getItem('userName');
    const savedPhone = localStorage.getItem('userPhone');
    const savedAddress = localStorage.getItem('userAddress');
    
    if (savedName) setName(savedName);
    if (savedPhone) setPhone(savedPhone);
    if (savedAddress) setAddress(savedAddress ? JSON.parse(savedAddress) : null);

    // Load applicable offers
    const loadOffers = async () => {
      const offers = await getApplicableOffers(getTotalPrice());
      setAvailableOffers(offers);
    };
    loadOffers();

    // Load delivery types
    const loadDeliveryTypes = async () => {
      const types = await getDeliveryTypes();
      setDeliveryTypes(types);
      if (types.length > 0) {
        setSelectedDeliveryType(types[0].id);
      }
    };
    loadDeliveryTypes();
  }, [items.length, navigate, getTotalPrice]);

  // Update delivery price when delivery type or address changes
  useEffect(() => {
    const updateDeliveryPrice = async () => {
      if (selectedDeliveryType && address?.neighborhood_id) {
        const price = await getDeliveryPrice(selectedDeliveryType, address.neighborhood_id);
        setDeliveryPrice(price);
      }
    };
    updateDeliveryPrice();
  }, [selectedDeliveryType, address]);

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
      localStorage.setItem('userName', name);
      localStorage.setItem('userPhone', phone);
      localStorage.setItem('userAddress', JSON.stringify(address));

      const orderData = {
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.offer_price || item.product.price,
          name: item.product.name,
        })),
        total: getTotalPrice() - discount + deliveryPrice,
        shipping_address: address,
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
          user_id: null, // Add user_id if authenticated
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
                <label htmlFor="name" className="font-medium">الاسم</label>
              </div>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-3 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل اسمك"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Phone size={18} className="ml-2 text-gray-500" />
                <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
              </div>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full p-3 border rounded-lg ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل رقم هاتفك"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="address" className="font-medium">العنوان</label>
              </div>
              <LocationPicker value={address || {}} onChange={val => setAddress(val)} />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
            </div>
          </div>

          {/* Add Delivery Type Selection */}
          <div className="bg-white rounded-lg p-4">
            <DeliveryTypeSelector
              options={deliveryTypes.map(type => ({
                ...type,
                price: deliveryPrice
              }))}
              selectedId={selectedDeliveryType}
              onSelect={setSelectedDeliveryType}
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
                  <span className="mr-2">{total.toFixed(2)} ج.م</span>
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
