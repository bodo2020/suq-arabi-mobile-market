
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/contexts/UserContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import DeliveryTypeSelector from '@/components/DeliveryTypeSelector';
import { getDeliveryTypes, getDeliveryPrice } from '@/utils/deliveryUtils';
import LocationPicker from '@/components/ui/LocationPicker';
import { CartItem } from '@/contexts/cartTypes';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const { user } = React.useContext(UserContext);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isLoading, setIsLoading] = useState(false);

  // For delivery
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [selectedDeliveryType, setSelectedDeliveryType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [deliveryPrices, setDeliveryPrices] = useState({});

  useEffect(() => {
    const loadDeliveryTypes = async () => {
      const types = await getDeliveryTypes();
      setDeliveryTypes(types);
      if (types.length > 0) {
        setSelectedDeliveryType(types[0].id);
      }
    };

    loadDeliveryTypes();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        // Check if user has a customer record
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (customerError && customerError.code !== 'PGRST116') {
          console.error('Error fetching customer data:', customerError);
          return;
        }
        
        if (customerData) {
          setFirstName(customerData.first_name || '');
          setLastName(customerData.last_name || '');
          setEmail(customerData.email || user.email || '');
          setPhone(customerData.phone || '');
          setAddress(customerData.address || '');
          
          // Fetch saved addresses
          const { data: addressData, error: addressError } = await supabase
            .from('customer_addresses')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single();
            
          if (!addressError && addressData) {
            setAddress(addressData.address);
            
            // Set location if available
            if (addressData.governorate_id && addressData.city_id && addressData.area_id) {
              setSelectedLocation({
                governorate: addressData.governorate_id,
                city: addressData.city_id,
                area: addressData.area_id,
                neighborhood: addressData.neighborhood_id || null
              });
            }
          }
        } else {
          setEmail(user.email || '');
        }
      } catch (error) {
        console.error('Error in loadUserData:', error);
      }
    };
    
    loadUserData();
  }, [user]);
  
  useEffect(() => {
    if (!selectedLocation || !selectedDeliveryType) return;
    
    const updateDeliveryPrice = async () => {
      const { price, priceMap } = await getDeliveryPrice(selectedLocation, selectedDeliveryType);
      setDeliveryPrice(price);
      setDeliveryPrices(priceMap);
    };
    
    updateDeliveryPrice();
  }, [selectedLocation, selectedDeliveryType]);

  const handleSubmitOrder = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (items.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "يرجى إضافة منتجات إلى سلة التسوق أولاً",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare order data
      const customerId = user ? await getCustomerId() : null;
      
      const orderData = {
        items: items.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.product.offer_price || item.product.price,
          bulk_quantity: item.product.bulk_quantity,
          is_bulk: item.is_bulk,
          unit_of_measure: item.unit_of_measure,
          total: getItemTotal(item)
        })),
        total: getTotalPrice() + deliveryPrice,
        shipping_cost: deliveryPrice,
        payment_method: paymentMethod,
        customer_id: customerId,
        shipping_address: address,
        notes: notes,
        delivery_location_id: selectedLocation?.area || null
      };
      
      // Create order
      const { data, error } = await supabase
        .from('online_orders')
        .insert([orderData])
        .select();
      
      if (error) {
        throw error;
      }
      
      // Save customer data if authenticated
      if (user && customerId) {
        await updateCustomerData(customerId);
      }
      
      // Clear cart and navigate to success page
      clearCart();
      navigate('/order-success', { state: { orderId: data[0].id } });
      
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "حدث خطأ",
        description: "تعذر إكمال الطلب. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getCustomerId = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // No customer record found, create one
          const { data: newCustomer, error: insertError } = await supabase
            .from('customers')
            .insert([{
              user_id: user.id,
              first_name: firstName,
              last_name: lastName,
              email: email,
              phone: phone,
              address: address,
              name: `${firstName} ${lastName}`.trim()
            }])
            .select('id')
            .single();
            
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
  
  const updateCustomerData = async (customerId) => {
    try {
      await supabase
        .from('customers')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          address: address,
          name: `${firstName} ${lastName}`.trim()
        })
        .eq('id', customerId);
    } catch (error) {
      console.error('Error updating customer data:', error);
    }
  };
  
  const validateForm = () => {
    if (!firstName) {
      toast({
        title: "الاسم الأول مطلوب",
        description: "يرجى إدخال الاسم الأول",
        variant: "destructive",
      });
      return false;
    }
    
    if (!phone) {
      toast({
        title: "رقم الهاتف مطلوب",
        description: "يرجى إدخال رقم الهاتف",
        variant: "destructive",
      });
      return false;
    }
    
    if (!address) {
      toast({
        title: "العنوان مطلوب",
        description: "يرجى إدخال العنوان",
        variant: "destructive",
      });
      return false;
    }
    
    if (!selectedLocation || !selectedLocation.area) {
      toast({
        title: "منطقة التوصيل مطلوبة",
        description: "يرجى اختيار منطقة التوصيل",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };
  
  const handleDeliveryTypeChange = (deliveryTypeId) => {
    setSelectedDeliveryType(deliveryTypeId);
    setDeliveryPrice(deliveryPrices[deliveryTypeId] || 0);
  };

  const getItemTotal = (item) => {
    if (item.is_bulk) {
      return item.product.bulk_price || 0;
    }
    
    if (item.unit_of_measure === 'weight') {
      const pricePerKg = item.product.offer_price || item.product.price || 0;
      return pricePerKg * (item.quantity / 1000);
    }
    
    return (item.product.offer_price || item.product.price) * item.quantity;
  };

  const formatQuantity = (item: CartItem) => {
    if (item.unit_of_measure === 'weight') {
      // Convert grams to kilograms with 3 decimal places
      const kgWeight = (item.quantity / 1000).toFixed(3);
      return `${kgWeight} كجم`;
    } else if (item.is_bulk) {
      // Return the bulk quantity from the product
      return `${item.product.bulk_quantity || 1}`;
    }
    return item.quantity;
  };

  return (
    <MainLayout>
      <div className="py-4 pb-24" dir="rtl">
        <h1 className="text-xl font-bold text-center mb-4">إكمال الطلب</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* بيانات المستخدم */}
          <div className="bg-white rounded-lg p-4 mb-4 order-2 md:order-1">
            <h3 className="text-lg font-bold mb-3">معلومات العميل</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">الاسم الأول</Label>
                  <Input 
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="الاسم الأول"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">الاسم الأخير</Label>
                  <Input 
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="الاسم الأخير"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                <Input 
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="البريد الإلكتروني"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input 
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="رقم الهاتف"
                />
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <h3 className="text-lg font-bold mb-3">معلومات التوصيل</h3>
            
            <div className="space-y-4">
              <div>
                <Label>موقع التوصيل</Label>
                <LocationPicker 
                  selectedLocation={selectedLocation} 
                  setSelectedLocation={setSelectedLocation} 
                />
              </div>
              
              <div>
                <Label htmlFor="address">العنوان بالتفصيل</Label>
                <Textarea 
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="العنوان بالتفصيل مثل: الشارع، رقم المبنى، الدور، الشقة"
                  className="resize-none"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>طريقة التوصيل</Label>
                <DeliveryTypeSelector 
                  deliveryTypes={deliveryTypes} 
                  selectedValue={selectedDeliveryType}
                  onChange={handleDeliveryTypeChange}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                <Textarea 
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية تريد إعلامنا بها"
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <h3 className="text-lg font-bold mb-3">طريقة الدفع</h3>
            
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="font-medium">
                  الدفع عند الاستلام
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* تفاصيل الطلب */}
          <div className="bg-white rounded-lg p-4 mb-4 order-1 md:order-2">
            <h3 className="text-lg font-bold mb-3">تفاصيل الطلب</h3>
            
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                السلة فارغة
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center">
                        <span className="text-gray-500 ml-1">{formatQuantity(item)} ×</span>
                        <span className="font-medium">{item.product.name}</span>
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
                  
                  <div className="flex justify-between py-2 border-b">
                    <span>التوصيل</span>
                    <span className="font-bold">{deliveryPrice.toFixed(2)} ج.م</span>
                  </div>
                  
                  <div className="flex justify-between py-2 font-bold">
                    <span>الإجمالي</span>
                    <span className="text-lg">{(getTotalPrice() + deliveryPrice).toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              className="w-full mt-6" 
              onClick={handleSubmitOrder}
              disabled={isLoading || items.length === 0}
            >
              {isLoading ? "جاري إرسال الطلب..." : "تأكيد الطلب"}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;
