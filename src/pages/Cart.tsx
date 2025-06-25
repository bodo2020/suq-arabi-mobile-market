
import React from 'react';
import { Trash2, Plus, Minus, Package, Scale } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
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

interface CustomerAddress {
  id: string;
  address: string;
  governorate_id?: string | null;
  city_id?: string | null;
  area_id?: string | null;
  neighborhood_id?: string | null;
  governorates?: { id: string; name: string } | null;
  cities?: { id: string; name: string } | null;
  areas?: { id: string; name: string } | null;
  neighborhoods?: { id: string; name: string } | null;
}

const Cart = () => {
  const navigate = useNavigate();
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
          governorates(id, name),
          cities(id, name),
          areas(id, name),
          neighborhoods(id, name)
        `).eq('user_id', user.id).eq('is_default', true).maybeSingle();
        
      const defaultAddress = addresses as CustomerAddress | null;
      
      return {
        ...customer,
        default_address: defaultAddress
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
      return item.product.bulk_price || item.product.price;
    } else if (item.product.offer_price && item.product.is_offer) {
      return item.product.offer_price;
    }
    return item.product.price;
  };

  return (
    <MainLayout>
      <div className="py-4">
        <h1 className="text-xl font-bold text-center mb-4">سلة التسوق</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <circle cx="8" cy="21" r="1"></circle>
              <circle cx="19" cy="21" r="1"></circle>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-500 mb-1">السلة فارغة</h3>
            <p className="text-sm text-gray-400 mb-4">لم تقم بإضافة أي منتجات بعد</p>
            <Link to="/" className="bg-primary text-white px-4 py-2 rounded-md">
              تسوق الآن
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg mb-4">
              {items.map((item) => (
                <div 
                  key={`${item.product.id}-${item.is_bulk}`} 
                  className="flex items-center p-3 border-b last:border-b-0"
                >
                  <div className="flex-1 flex items-center">
                    <div className="ml-3 flex-1">
                      <Link to={`/product/${item.product.id}`} className="font-semibold text-sm line-clamp-1">
                        {item.product.name}
                        {item.is_bulk && (
                          <Badge variant="secondary" className="mr-2 text-xs">
                            <Package size={12} className="ml-1" />
                            {item.product.bulk_quantity}x جملة
                          </Badge>
                        )}
                        {item.product.unit_of_measure === 'weight' && (
                          <Badge variant="outline" className="mr-2 text-xs">
                            <Scale size={12} className="ml-1" />
                            {item.quantity}g
                          </Badge>
                        )}
                      </Link>
                      <div className="flex items-center mt-1">
                        <span className="text-sm font-bold text-primary ml-2">
                          {getItemPrice(item)} ج.م
                        </span>
                        {item.product.offer_price && item.product.is_offer && !item.is_bulk && (
                          <span className="text-xs line-through text-gray-500">
                            {item.product.price} ج.م
                          </span>
                        )}
                      </div>
                    </div>
                    <img 
                      src={getProductImage(item)} 
                      alt={item.product.name} 
                      className="h-16 w-16 object-contain"
                    />
                  </div>

                  <div className="flex flex-col items-center mr-3">
                    <div className="flex items-center justify-between bg-gray-100 rounded-lg mb-2">
                      <button 
                        onClick={() => handleDecreaseQuantity(item.product.id, item.is_bulk, item.product.unit_of_measure)}
                        className="p-1"
                        aria-label="تقليل الكمية"
                      >
                        <Minus size={16} />
                      </button>
                      <span 
                        className="mx-2 font-medium cursor-pointer hover:text-primary"
                        onClick={() => handleQuantityClick(item.product.id, item.product.unit_of_measure)}
                      >
                        {item.quantity}
                        {item.product.unit_of_measure === 'weight' ? 'g' : ''}
                      </span>
                      <button 
                        onClick={() => handleIncreaseQuantity(item.product.id, item.is_bulk, item.product.unit_of_measure)}
                        className="p-1"
                        aria-label="زيادة الكمية"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.product.id, item.is_bulk)}
                      className="text-red-500"
                      aria-label="حذف المنتج"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Location display */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="text-lg font-bold mb-3">عنوان التوصيل</h3>
              {customerData?.default_address ? (
                <AddressDisplay
                  address={customerData.default_address.address}
                  areaName={customerData.default_address.areas?.name || ''}
                  neighborhoodName={customerData.default_address.neighborhoods?.name || ''}
                  showAddressSelector={true}
                />
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">لم يتم تحديد عنوان التوصيل</p>
                  <Button onClick={() => navigate('/add-address')} variant="outline">
                    إضافة عنوان
                  </Button>
                </div>
              )}
            </div>

            {/* Free delivery progress */}
            {progressToFreeDelivery > 0 && progressToFreeDelivery < 100 && (
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">التوصيل المجاني</span>
                  <span className="text-sm text-gray-500">{progressToFreeDelivery.toFixed(0)}%</span>
                </div>
                <Progress value={progressToFreeDelivery} className="mb-2" />
                <p className="text-xs text-gray-500">
                  أضف منتجات بقيمة {(50 - getTotalPrice()).toFixed(2)} ج.م للحصول على توصيل مجاني
                </p>
              </div>
            )}

            {isFreeDelivery && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-700 font-medium">تهانينا! لقد حصلت على توصيل مجاني</p>
              </div>
            )}

            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="text-lg font-bold mb-3">ملخص الطلب</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>المجموع الفرعي</span>
                  <span>{getTotalPrice().toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>رسوم التوصيل</span>
                  <span>{isFreeDelivery ? 'مجاني' : `${deliveryPrice} ج.م`}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>الخصم</span>
                    <span>-{discount.toFixed(2)} ج.م</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between py-2 mt-2">
                  <span className="font-bold text-lg">
                    {(getTotalPrice() + (isFreeDelivery ? 0 : deliveryPrice) - discount).toFixed(2)} ج.م
                  </span>
                  <span className="font-bold">الإجمالي</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4">
              <CouponInput 
                subtotal={getTotalPrice()} 
                onApply={(discountAmount) => setDiscount(discountAmount)}
              />
            </div>

            <Link to="/checkout" className="bg-primary text-white py-3 rounded-lg flex items-center justify-center w-full">
              متابعة الطلب
            </Link>
          </>
        )}

        {/* Weight Selector Modal */}
        {openWeightSelector && (
          <WeightSelector
            isOpen={!!openWeightSelector}
            onClose={() => setOpenWeightSelector(null)}
            productId={openWeightSelector}
            currentWeight={items.find(item => item.product.id === openWeightSelector)?.quantity || 100}
            onWeightSelect={(weight) => {
              updateQuantity(openWeightSelector, weight);
              setOpenWeightSelector(null);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Cart;
