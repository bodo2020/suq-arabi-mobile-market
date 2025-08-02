import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/useCart';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import OrderNotes from '@/components/ui/OrderNotes';
import AddressDisplay from '@/components/ui/AddressDisplay';
import AddressSelector from '@/components/ui/AddressSelector';
import { ArrowRight, ShoppingCart, MapPin, CreditCard } from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getCartTotal } = useCart();
  const { user, session } = useUser();
  const { toast } = useToast();
  
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [notes, setNotes] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Allow non-users to access checkout (using localStorage address)
    if (user) {
      fetchAddresses();
    } else {
      // Check if there's a saved address in localStorage for non-users
      try {
        const savedAddress = localStorage.getItem('selectedAddress');
        if (savedAddress) {
          const parsedAddress = JSON.parse(savedAddress);
          setDeliveryFee(parsedAddress.delivery_price || 0);
        }
      } catch (error) {
        console.error('Error parsing saved address:', error);
      }
      setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    if (selectedAddress) {
      updateDeliveryFee();
    }
  }, [selectedAddress]);
  
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
          governorates(id, name),
          cities(id, name),
          areas(id, name),
          neighborhoods(id, name, price)
        `)
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setAddresses(data || []);
      
      if (data && data.length > 0) {
        const defaultAddress = data.find(addr => addr.is_default) || data[0];
        setSelectedAddressId(defaultAddress.id);
        setSelectedAddress(defaultAddress);
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
  
  const updateDeliveryFee = async () => {
    // Check both user address and localStorage address
    let neighborhoodId = selectedAddress?.neighborhood_id;
    
    // If no user, try to get address from localStorage
    if (!user) {
      try {
        const savedAddress = localStorage.getItem('selectedAddress');
        if (savedAddress) {
          const parsedAddress = JSON.parse(savedAddress);
          neighborhoodId = parsedAddress.neighborhood_id;
          // Use the price from saved address directly
          if (parsedAddress.delivery_price !== undefined) {
            setDeliveryFee(parsedAddress.delivery_price);
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing saved address:', error);
      }
    }
    
    if (!neighborhoodId) return;
    
    try {
      // Get delivery price from neighborhood
      const { data: neighborhood, error } = await supabase
        .from('neighborhoods')
        .select('price')
        .eq('id', neighborhoodId)
        .single();
        
      if (error || !neighborhood) {
        console.error('Error fetching neighborhood delivery price:', error);
        setDeliveryFee(0);
        return;
      }
      
      setDeliveryFee(neighborhood.price || 0);
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      setDeliveryFee(0);
    }
  };
  
  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId);
    const address = addresses.find(addr => addr.id === addressId);
    setSelectedAddress(address);
  };
  
  const handleOrder = async () => {
    // Check for address (either selected or localStorage)
    let addressToUse = selectedAddress;
    
    if (!user) {
      try {
        const savedAddress = localStorage.getItem('selectedAddress');
        if (savedAddress) {
          const parsedAddress = JSON.parse(savedAddress);
          addressToUse = {
            id: 'temp-address',
            neighborhood_id: parsedAddress.neighborhood_id,
            address: parsedAddress.address,
            full_address: parsedAddress.full_address
          };
        }
      } catch (error) {
        console.error('Error parsing saved address:', error);
      }
    }
    
    if (!addressToUse) {
      toast({
        title: "عنوان التوصيل مطلوب",
        description: "يرجى اختيار عنوان التوصيل للمتابعة",
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
          customer_id: user?.id || null,
          items: items.map(item => ({
            product_id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.offer_price || item.product.price,
            total: (item.product.offer_price || item.product.price) * item.quantity,
            is_bulk: item.is_bulk || false,
            unit_of_measure: item.unit_of_measure
          })),
          total: getCartTotal() + deliveryFee,
          shipping_cost: deliveryFee,
          delivery_location_id: addressToUse.neighborhood_id,
          shipping_address: addressToUse.address || addressToUse.full_address,
          payment_method: 'cash',
          notes: notes || null
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
      <div className="pt-24"> {/* Add padding for fixed header */}
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
                <div className="flex items-center mb-4">
                  <MapPin size={20} className="ml-2 text-primary" />
                  <h2 className="font-bold text-lg">عنوان التوصيل</h2>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : user && addresses.length > 0 ? (
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
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <input
                                type="radio"
                                checked={selectedAddressId === address.id}
                                onChange={() => handleAddressSelect(address.id)}
                                className="ml-2"
                              />
                              <span className="font-medium">
                                {address.areas?.name || ''}
                                {address.neighborhoods?.name ? ` - ${address.neighborhoods?.name}` : ''}
                              </span>
                              {address.is_default && (
                                <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  الافتراضي
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{address.address}</p>
                          </div>
                        </div>
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
                ) : user ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">لا توجد عناوين مسجلة</p>
                    <Button
                      onClick={() => navigate('/add-address')}
                      variant="default"
                    >
                      إضافة عنوان جديد
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AddressSelector onAddressSelect={(addressData) => {
                      setDeliveryFee(addressData.delivery_price || 0);
                      
                      toast({
                        title: "تم تحديد العنوان",
                        description: "تم تحديد عنوان التوصيل بنجاح"
                      });
                    }}>
                      <Button variant="default" className="w-full">
                        اختر عنوان التوصيل
                      </Button>
                    </AddressSelector>
                  </div>
                )}
              </div>
              
              {/* Payment Method */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-4">
                  <CreditCard size={20} className="ml-2 text-primary" />
                  <h2 className="font-bold text-lg">طريقة الدفع</h2>
                </div>
                <div className="border rounded-lg p-3 bg-primary/5 border-primary">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      checked={true}
                      readOnly
                      className="ml-2"
                    />
                    <div>
                      <span className="font-medium">الدفع عند الاستلام</span>
                      <p className="text-sm text-gray-600">ادفع نقداً عند وصول طلبك</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Order Notes */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h2 className="font-bold text-lg mb-4">ملاحظات الطلب</h2>
                <OrderNotes value={notes} onChange={setNotes} />
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg p-4 shadow-sm sticky top-32">
                <div className="flex items-center mb-4">
                  <ShoppingCart size={20} className="ml-2" />
                  <h2 className="font-bold text-lg">ملخص الطلب</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>المنتجات ({items.length})</span>
                      <span>{getCartTotal()} ج.م</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>التوصيل</span>
                      <span>{deliveryFee} ج.م</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between font-bold">
                    <span>الإجمالي</span>
                    <span>{getCartTotal() + deliveryFee} ج.م</span>
                  </div>
                  
                  <Button 
                    onClick={handleOrder}
                    className="w-full"
                    disabled={items.length === 0 || (!selectedAddress && (!localStorage.getItem('selectedAddress')))}
                  >
                    تأكيد الطلب
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    بالضغط على "تأكيد الطلب" أنت توافق على الشروط والأحكام
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;