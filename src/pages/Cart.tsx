import React from 'react';
import { Trash2, Plus, Minus, Package, Scale } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import WeightSelector from '@/components/ui/WeightSelector';
import DeliveryTypeSelector from '@/components/DeliveryTypeSelector';
import { Progress } from '@/components/ui/progress';
import CouponInput from '@/components/ui/CouponInput';
import { getFreeDeliveryOffer } from '@/utils/offerUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LocationPicker from '@/components/ui/LocationPicker';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import LocationDisplay from '@/components/ui/LocationDisplay';
import AddressDisplay from '@/components/ui/AddressDisplay';
import { useIsMobile } from '@/hooks/use-mobile';

const Cart = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const {
    items,
    updateQuantity,
    removeFromCart,
    getTotalPrice
  } = useCart();
  const {
    toast
  } = useToast();
  const {
    user
  } = useUser();
  const [openWeightSelector, setOpenWeightSelector] = React.useState<string | null>(null);
  const [discount, setDiscount] = React.useState(0);
  const [deliveryPrice, setDeliveryPrice] = React.useState(0);
  const [isFreeDelivery, setIsFreeDelivery] = React.useState(false);
  const [progressToFreeDelivery, setProgressToFreeDelivery] = React.useState(0);
  const [selectedLocation, setSelectedLocation] = React.useState<{
    governorate?: string;
    city?: string;
    area?: string;
    neighborhood?: string;
  }>({});

  const handleSearchFocus = () => {
    navigate('/search');
  };

  const {
    data: customerData
  } = useQuery({
    queryKey: ['customerData', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const {
        data: customer
      } = await supabase.from('customers').select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `).eq('user_id', user.id).single();

      const {
        data: addresses
      } = await supabase.from('customer_addresses').select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `).eq('user_id', user.id).eq('is_default', true).maybeSingle();
      return {
        ...customer,
        default_address: addresses
      };
    },
    enabled: !!user?.id
  });

  const {
    data: deliveryTypes = []
  } = useQuery({
    queryKey: ['deliveryTypes', selectedLocation],
    queryFn: async () => {
      if (!selectedLocation.governorate) return [];
      const query = supabase.from('delivery_type_pricing').select(`
          price,
          estimated_time,
          delivery_types (
            id,
            name,
            description
          )
        `).eq('delivery_types.active', true);
      if (selectedLocation.neighborhood) {
        query.eq('delivery_location_id', selectedLocation.neighborhood);
      } else if (selectedLocation.area) {
        query.eq('delivery_location_id', selectedLocation.area);
      } else if (selectedLocation.city) {
        query.eq('delivery_location_id', selectedLocation.city);
      } else if (selectedLocation.governorate) {
        query.eq('delivery_location_id', selectedLocation.governorate);
      }
      const {
        data: pricing
      } = await query;
      return (pricing || []).map(p => ({
        id: p.delivery_types.id,
        name: p.delivery_types.name,
        description: p.delivery_types.description,
        price: p.price,
        estimated_time: p.estimated_time
      }));
    },
    enabled: !!selectedLocation.governorate
  });

  React.useEffect(() => {
    if (deliveryTypes.length > 0) {
      setDeliveryPrice(deliveryTypes[0].price || 0);
    }
  }, [deliveryTypes]);

  const {
    data: deliveryPricing
  } = useQuery({
    queryKey: ['deliveryPricing', customerData?.default_address],
    queryFn: async () => {
      if (!customerData?.default_address) return null;
      const locationId = customerData.default_address.neighborhood_id || customerData.default_address.area_id || customerData.default_address.city_id || customerData.default_address.governorate_id;
      if (!locationId) return null;
      const {
        data
      } = await supabase.from('delivery_type_pricing').select('*').eq('delivery_location_id', locationId).maybeSingle();
      return data;
    },
    enabled: !!customerData?.default_address
  });

  React.useEffect(() => {
    if (deliveryPricing?.price !== undefined) {
      setDeliveryPrice(deliveryPricing.price);
    }
  }, [deliveryPricing]);
  React.useEffect(() => {
    const checkFreeDelivery = async () => {
      const subtotal = getTotalPrice();
      const freeDeliveryOffer = await getFreeDeliveryOffer(subtotal);
      if (freeDeliveryOffer) {
        const threshold = freeDeliveryOffer.min_order_amount;
        const progress = subtotal / threshold * 100;
        setProgressToFreeDelivery(Math.min(progress, 100));
        setIsFreeDelivery(progress >= 100);
      }
    };
    checkFreeDelivery();
  }, [getTotalPrice()]);
  const handleQuantityClick = (productId: string, unit_of_measure?: string) => {
    if (unit_of_measure === 'weight') {
      const item = items.find(item => item.product.id === productId);
      if (item) {
        setOpenWeightSelector(productId);
      }
    }
  };
  const handleDecreaseQuantity = (productId: string, is_bulk: boolean = false, unit_of_measure?: string) => {
    if (unit_of_measure !== 'weight') {
      const item = items.find(item => item.product.id === productId && item.is_bulk === is_bulk);
      if (item) {
        if (item.quantity > 1) {
          updateQuantity(productId, item.quantity - 1, is_bulk);
        } else {
          removeFromCart(productId, is_bulk);
          toast({
            title: "تم الحذف",
            description: "تم حذف المنتج من السلة"
          });
        }
      }
    }
  };
  const handleIncreaseQuantity = (productId: string, is_bulk: boolean = false, unit_of_measure?: string) => {
    if (unit_of_measure !== 'weight') {
      const item = items.find(item => item.product.id === productId && item.is_bulk === is_bulk);
      if (item) {
        const currentCartQuantity = items
          .filter(i => i.product.id === productId)
          .reduce((total, i) => {
            if (i.is_bulk) {
              return total + (i.quantity * (i.product.bulk_quantity || 1));
            }
            return total + i.quantity;
          }, 0);

        const quantityToAdd = is_bulk ? (item.product.bulk_quantity || 1) : 1;
        
        if (currentCartQuantity + quantityToAdd <= item.product.quantity) {
          updateQuantity(productId, item.quantity + 1, is_bulk);
        } else {
          toast({
            title: "تنبيه",
            description: "الكمية المطلوبة غير متوفرة",
            variant: "destructive"
          });
        }
      }
    }
  };
  const handleRemoveItem = (productId: string, is_bulk: boolean = false) => {
    removeFromCart(productId, is_bulk);
    toast({
      title: "تم الحذف",
      description: "تم حذف المنتج من السلة"
    });
  };
  const getProductImage = item => {
    return item.product.image_urls && item.product.image_urls.length > 0 ? item.product.image_urls[0] : '/placeholder.svg';
  };
  const getItemPrice = item => {
    if (item.is_bulk) {
      return item.product.bulk_price;
    }
    return item.product.offer_price || item.product.price;
  };
  const getItemTotal = item => {
    if (item.is_bulk) {
      return (item.product.bulk_price || 0) * item.quantity;
    }
    if (item.unit_of_measure === 'weight') {
      const pricePerKg = item.product.offer_price || item.product.price || 0;
      return pricePerKg * (item.quantity / 1000);
    }
    return (item.product.offer_price || item.product.price) * item.quantity;
  };
  const formatBulkQuantity = item => {
    if (item.is_bulk && item.product.bulk_quantity) {
      return `${item.product.bulk_quantity} قطعة`;
    }
    return `${item.quantity}`;
  };
  const handleDeliverySelect = (id: string) => {
    const selectedType = deliveryTypes.find(type => type.id === id);
    if (selectedType) {
      setDeliveryPrice(selectedType.price);
    }
  };
  const handleProceedToCheckout = () => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يرجى تسجيل الدخول أو إنشاء حساب للمتابعة",
        variant: "destructive"
      });
      navigate('/phone-login');
      return;
    }
    
    navigate('/checkout');
  };
  return (
    <MainLayout>
      <div className="container px-0 py-0">
        {/* Top Navigation Bar */}
        <TopNavBar 
          searchPlaceholder="البحث في السلة..."
          onSearchFocus={handleSearchFocus}
          hideLogo={true}
          hideSearch={true}
          pageTitle="سلة التسوق"
        />

        {/* Main Content with proper spacing */}
        <div className={`${!isMobile ? 'mt-24' : 'mt-6'} py-4 pb-24`} dir="rtl">
          {items.length === 0 ? <div className="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <circle cx="8" cy="21" r="1"></circle>
              <circle cx="19" cy="21" r="1"></circle>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-500 mb-1">لم تقم بإضافة أي منتجات بعد</h3>
            <p className="text-sm text-gray-400 mb-4">لم تقم بإضافة أي منتجات بعد</p>
            <Link to="/" className="bg-primary text-white px-4 py-2 rounded-md">
              تسوق الآن
            </Link>
          </div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg mb-4 order-1">
              {items.map(item => <div key={`${item.product.id}-${item.is_bulk ? 'bulk' : 'regular'}`} className="flex items-center p-3 border-b last:border-b-0">
                  <div className="relative">
                    <img src={getProductImage(item)} alt={item.product.name} className="h-16 w-16 object-contain ml-3" />
                    {item.is_bulk && <div className="absolute bottom-0 right-0 bg-primary text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {item.product.bulk_quantity}
                      </div>}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2">
                      <Link to={`/product/${item.product.id}`} className="font-semibold text-sm line-clamp-1">
                        {item.product.name}
                      </Link>
                      {item.is_bulk && <Badge variant="secondary" className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          جملة
                        </Badge>}
                      {item.unit_of_measure === 'weight' && <Badge variant="secondary" className="flex items-center gap-1">
                          <Scale className="w-3 h-3" />
                          وزن
                        </Badge>}
                    </div>
                    <div className="flex items-center mt-1">
                      {item.is_bulk ? <span className="text-sm font-bold text-primary">
                          {item.product.bulk_price} ج.م (سعر الوحدة)
                        </span> : item.unit_of_measure === 'weight' ? <span className="text-sm font-bold">
                          {item.product.price} ج.م/كجم
                        </span> : item.product.offer_price ? <>
                          <span className="text-sm font-bold text-primary ml-2">
                            {item.product.offer_price} ج.م
                          </span>
                          <span className="text-xs line-through text-gray-500">
                            {item.product.price} ج.م
                          </span>
                        </> : <span className="text-sm font-bold">
                          {item.product.price} ج.م
                        </span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-center mr-3">
                    <div className="flex items-center justify-between bg-gray-100 rounded-lg mb-2">
                      {item.unit_of_measure === 'weight' ? <div onClick={() => handleQuantityClick(item.product.id, item.unit_of_measure)} className="px-4 py-2 cursor-pointer flex items-center gap-2">
                          <span className="font-medium">{item.quantity}جم</span>
                        </div> : <>
                          <button onClick={() => handleDecreaseQuantity(item.product.id, item.is_bulk)} className="p-1" aria-label="تقليل الكمية">
                            <Minus size={16} />
                          </button>
                          <span className="mx-2 font-medium">
                            {item.quantity}
                          </span>
                          <button onClick={() => handleIncreaseQuantity(item.product.id, item.is_bulk)} className="p-1" aria-label="زيادة الكمية">
                            <Plus size={16} />
                          </button>
                        </>}
                    </div>
                    <div className="flex items-center">
                      <button onClick={() => handleRemoveItem(item.product.id, item.is_bulk)} className="text-red-500" aria-label="حذف المنتج">
                        <Trash2 size={16} />
                      </button>
                      <span className="mr-2 font-semibold text-green-700">
                        {getItemTotal(item).toFixed(2)} ج.م
                      </span>
                    </div>
                    {item.is_bulk && item.product.bulk_quantity && <div className="text-xs text-gray-500 mt-1">
                        {item.quantity} × {item.product.bulk_quantity} = {item.quantity * item.product.bulk_quantity} قطعة
                      </div>}
                  </div>
                  
                  {openWeightSelector === item.product.id && <WeightSelector product={item.product} isOpen={true} onClose={() => setOpenWeightSelector(null)} />}
                </div>)}
            </div>

            <div className="space-y-4 order-2">
              {!isFreeDelivery && progressToFreeDelivery > 0 && <div className="bg-white rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-primary font-medium">التوصيل المجاني</span>
                    <span className="text-sm text-gray-500">{progressToFreeDelivery.toFixed(0)}%</span>
                  </div>
                  <Progress value={progressToFreeDelivery} className="h-2" />
                  <p className="text-sm text-gray-500 mt-2">
                    أضف المزيد من المنتجات للحصول على توصيل مجاني
                  </p>
                </div>}
              
              <div className="bg-white rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold">عنوان التوصيل</h3>
                  <Button variant="ghost" onClick={() => navigate('/addresses')} className="text-primary">
                    {customerData?.default_address ? 'تغيير العنوان' : 'إضافة عنوان'}
                  </Button>
                </div>
                
                {customerData?.default_address ? (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">
                      {customerData.default_address.neighborhoods?.name && `${customerData.default_address.neighborhoods.name}، `}
                      {customerData.default_address.areas?.name && `${customerData.default_address.areas.name}، `}
                      {customerData.default_address.cities?.name && `${customerData.default_address.cities.name}، `}
                      {customerData.default_address.governorates?.name}
                    </p>
                    <p className="text-gray-600">{customerData.default_address.address}</p>
                    {deliveryPricing && (
                      <p className="text-sm text-primary mt-2">
                        رسوم التوصيل: {deliveryPricing.price} ج.م
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">لا يوجد عنوان للتوصيل</p>
                    <Button variant="outline" onClick={() => navigate('/addresses')} className="text-primary border-primary hover:bg-primary/10">
                      إضافة عنوان جديد
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-4">
                <CouponInput subtotal={getTotalPrice()} onApply={setDiscount} />
              </div>

              <div className="bg-white rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3">ملخص الطلب</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span>المجموع</span>
                    <span className="font-bold">{getTotalPrice().toFixed(2)} ج.م</span>
                  </div>
                  
                  {discount > 0 && <div className="flex justify-between py-2 border-b text-primary">
                      <span>الخصم</span>
                      <span>- {discount.toFixed(2)} ج.م</span>
                    </div>}
                  
                  <div className="flex justify-between py-2 border-b">
                    <span>التوصيل</span>
                    <span className="font-bold">
                      {isFreeDelivery ? <span className="text-primary">مجاناً</span> : `${deliveryPrice.toFixed(2)} ج.م`}
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
              
              <Button onClick={handleProceedToCheckout} className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center">
                متابعة الطلب
              </Button>
            </div>
          </div>}
        </div>
      </div>
    </MainLayout>
  );
};

export default Cart;
