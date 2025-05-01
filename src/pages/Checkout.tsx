
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/useCart';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import DeliveryTypeSelector from '@/components/DeliveryTypeSelector';
import OrderNotes from '@/components/ui/OrderNotes';
import CouponInput from '@/components/ui/CouponInput';
import { calculateDeliveryFee } from '@/utils/deliveryUtils';
import AddressDisplay from '@/components/ui/AddressDisplay';
import { ArrowRight, ShoppingCart } from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice } = useCart();
  const { user, session } = useUser();
  const { toast } = useToast();
  
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [deliveryType, setDeliveryType] = useState("standard");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const deliveryTypes = [
    {
      id: "standard",
      name: "توصيل قياسي",
      description: "توصيل خلال 2-3 أيام",
      image: "/placeholder.svg",
      price: 20
    },
    {
      id: "express",
      name: "توصيل سريع",
      description: "توصيل خلال 24 ساعة",
      image: "/placeholder.svg",
      price: 50
    }
  ];
  
  useEffect(() => {
    if (!session) {
      navigate('/account');
      return;
    }
    
    fetchAddresses();
  }, [session, navigate]);
  
  useEffect(() => {
    if (selectedAddress) {
      updateDeliveryFee();
    }
  }, [selectedAddress, deliveryType]);
  
  const fetchAddresses = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        return;
      }
      
      const { data, error } = await supabase
        .from('customer_addresses')
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setAddresses(data || []);
      
      if (data && data.length > 0) {
        setSelectedAddressId(data[0].id);
        setSelectedAddress(data[0]);
      }
      
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({
        title: "خطأ في تحميل العناوين",
        description: "حدث خطأ أثناء تحميل العناوين، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const updateDeliveryFee = () => {
    if (!selectedAddress) return;
    
    const baseDeliveryFee = deliveryTypes.find(t => t.id === deliveryType)?.price || 0;
    const locationFee = calculateDeliveryFee(selectedAddress.location);
    
    setDeliveryFee(baseDeliveryFee + locationFee);
  };
  
  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId);
    const address = addresses.find(addr => addr.id === addressId);
    setSelectedAddress(address);
  };
  
  const handleDeliveryTypeSelect = (typeId) => {
    setDeliveryType(typeId);
  };
  
  const handleCouponApply = (amount) => {
    setDiscountAmount(amount);
    
    toast({
      title: "تم تطبيق الكوبون",
      description: `تم خصم ${amount} ج.م من طلبك`,
    });
  };
  
  const handleOrder = async () => {
    if (!selectedAddress) {
      toast({
        title: "لم يتم اختيار عنوان",
        description: "يرجى اختيار عنوان للتوصيل",
        variant: "destructive"
      });
      return;
    }
    
    if (items.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "يرجى إضافة منتجات إلى السلة",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Create the order in the database
      const { data, error } = await supabase
        .from('online_orders')
        .insert({
          customer_id: user.id,  // Use customer_id instead of user_id
          items: items,
          delivery_location_id: selectedAddress.id,
          shipping_address: selectedAddress.address,
          delivery_type: deliveryType,
          notes: notes,
          payment_method: null,  // Will be set in payment page
          payment_status: "pending",
          shipping_cost: deliveryFee,
          subtotal: getTotalPrice(),
          total: getTotalPrice() - discountAmount + deliveryFee,
          status: "waiting"  // Changed from "pending" to "waiting" to match the enum
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Navigate to payment with order ID
      navigate(`/payment?order_id=${data.id}`);
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "خطأ في إنشاء الطلب",
        description: "حدث خطأ أثناء إنشاء الطلب، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    }
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">إتمام الطلب</h1>
          <div className="w-10"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Address Selection */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="font-bold text-lg mb-4">عنوان التوصيل</h2>
              
              {loading ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : addresses.length > 0 ? (
                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div 
                      key={address.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedAddressId === address.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200"
                      }`}
                      onClick={() => handleAddressSelect(address.id)}
                    >
                      <AddressDisplay 
                        address={address.address}
                        areaName={address.areas?.name}
                        neighborhoodName={address.neighborhoods?.name}
                        onEdit={() => navigate(`/edit-address/${address.id}`)}
                      />
                    </div>
                  ))}
                  
                  <Button
                    onClick={() => navigate('/address-manager')}
                    variant="outline" 
                    className="w-full"
                  >
                    إدارة العناوين
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-4">لا توجد عناوين مسجلة</p>
                  <Button
                    onClick={() => navigate('/add-address')}
                    variant="default"
                  >
                    إضافة عنوان جديد
                  </Button>
                </div>
              )}
            </div>
            
            {/* Delivery Type */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="font-bold text-lg mb-4">نوع التوصيل</h2>
              <DeliveryTypeSelector
                options={deliveryTypes}
                selectedId={deliveryType}
                onSelect={handleDeliveryTypeSelect}
              />
            </div>
            
            {/* Order Notes */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="font-bold text-lg mb-4">ملاحظات الطلب</h2>
              <OrderNotes value={notes} onChange={setNotes} />
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg p-4 shadow-sm sticky top-24">
              <div className="flex items-center mb-4">
                <ShoppingCart size={20} className="ml-2" />
                <h2 className="font-bold text-lg">ملخص الطلب</h2>
              </div>
              
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>المنتجات ({items.length})</span>
                    <span>{getTotalPrice()} ج.م</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>التوصيل</span>
                    <span>{deliveryFee} ج.م</span>
                  </div>
                  
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 mt-2">
                      <span>الخصم</span>
                      <span>- {discountAmount} ج.م</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between font-bold">
                  <span>الإجمالي</span>
                  <span>{getTotalPrice() - discountAmount + deliveryFee} ج.م</span>
                </div>
                
                {/* Coupon Input */}
                <div className="pt-3 border-t">
                  <CouponInput 
                    subtotal={getTotalPrice()} 
                    onApply={handleCouponApply} 
                  />
                </div>
                
                <Button 
                  onClick={handleOrder}
                  className="w-full"
                  disabled={!selectedAddress || items.length === 0}
                >
                  متابعة الدفع
                </Button>
                
                <p className="text-xs text-gray-500 text-center">
                  بالضغط على "متابعة الدفع" أنت توافق على الشروط والأحكام
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;
