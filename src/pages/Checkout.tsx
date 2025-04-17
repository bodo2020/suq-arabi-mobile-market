
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, User, Phone, Check } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/contexts/CartContext';
import { submitOrder } from '@/lib/supabase';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    address: '',
  });

  // Get the image of a product, handling the new image_urls array
  const getProductImage = (item) => {
    return item.product.image_urls && item.product.image_urls.length > 0 
      ? item.product.image_urls[0] 
      : '/placeholder.svg';
  };

  useEffect(() => {
    // If cart is empty, redirect to cart page
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    // Load user info if available
    const savedName = localStorage.getItem('userName');
    const savedPhone = localStorage.getItem('userPhone');
    const savedAddress = localStorage.getItem('userAddress');
    
    if (savedName) setName(savedName);
    if (savedPhone) setPhone(savedPhone);
    if (savedAddress) setAddress(savedAddress);
  }, [items.length, navigate]);

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

    if (!address.trim()) {
      newErrors.address = 'العنوان مطلوب';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Save user info
      localStorage.setItem('userName', name);
      localStorage.setItem('userPhone', phone);
      localStorage.setItem('userAddress', address);

      // Prepare order data
      const orderData = {
        user_id: phone, // Using phone as user identifier for now
        status: 'pending',
        total: getTotalPrice(),
        shipping_address: address,
        shipping_cost: 0,
        payment_method: 'cash_on_delivery',
        payment_status: 'pending',
        notes: '',
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.offer_price || item.product.price,
        })),
      };

      // Submit order to Supabase (in real implementation)
      // await submitOrder(orderData);

      // Clear cart
      clearCart();

      // Navigate to success page
      navigate('/order-success');
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Total calculations
  const subtotal = getTotalPrice();
  const deliveryFee = 0; // Free delivery for now
  const total = subtotal + deliveryFee;

  return (
    <MainLayout>
      <div className="py-4 pb-24">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">إتمام الطلب</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Information */}
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
                className={`w-full p-3 border rounded-lg text-right ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
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
                className={`w-full p-3 border rounded-lg text-right ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل رقم هاتفك"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="address" className="font-medium">العنوان</label>
              </div>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل عنوانك للتوصيل"
                rows={3}
              />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-bold text-lg mb-4">ملخص الطلب</h2>
            
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center">
                    <span className="text-gray-500 ml-1">{item.quantity} ×</span>
                    <span className="font-medium">{item.product.name}</span>
                  </div>
                  <span>{((item.product.offer_price || item.product.price) * item.quantity).toFixed(2)} ر.س</span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">{subtotal.toFixed(2)} ر.س</span>
                <span className="text-gray-600">المجموع</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">{deliveryFee.toFixed(2)} ر.س</span>
                <span className="text-gray-600">رسوم التوصيل</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold text-lg">{total.toFixed(2)} ر.س</span>
                <span className="font-bold">الإجمالي</span>
              </div>
            </div>
          </div>

          {/* Payment Method (Currently only cash on delivery) */}
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

          {/* Submit Button */}
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
                  <span className="mr-2">{total.toFixed(2)} ر.س</span>
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
