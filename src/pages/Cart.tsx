import React from 'react';
import { Trash2, Plus, Minus, Package, Scale } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import WeightSelector from '@/components/ui/WeightSelector';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import AddressSelector from '@/components/ui/AddressSelector';
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
  
  const { toast } = useToast();
  const { user } = useUser();
  
  const [openWeightSelector, setOpenWeightSelector] = React.useState<string | null>(null);

  const { data: customerData } = useQuery({
    queryKey: ['customerData', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: customer } = await supabase
        .from('customers')
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .eq('user_id', user.id)
        .single();

      const { data: addresses } = await supabase
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
        
      return {
        ...customer,
        default_address: addresses
      };
    },
    enabled: !!user?.id
  });

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

  const getProductImage = (item: any) => {
    return item.product.image_urls && item.product.image_urls.length > 0 
      ? item.product.image_urls[0] 
      : '/placeholder.svg';
  };

  const getItemTotal = (item: any) => {
    if (item.is_bulk) {
      return (item.product.bulk_price || 0) * item.quantity;
    }
    if (item.unit_of_measure === 'weight') {
      const pricePerKg = item.product.offer_price || item.product.price || 0;
      return pricePerKg * (item.quantity / 1000);
    }
    return (item.product.offer_price || item.product.price) * item.quantity;
  };

  const handleProceedToCheckout = () => {
    // Check if there's an address (either from user or localStorage)
    const hasAddress = user ? customerData?.default_address : localStorage.getItem('selectedAddress');
    
    if (!hasAddress) {
      toast({
        title: "عنوان التوصيل مطلوب",
        description: "يرجى اختيار عنوان التوصيل أولاً",
        variant: "destructive"
      });
      return;
    }
    
    navigate('/checkout');
  };

  return (
    <MainLayout>
      <div className="container px-0 py-0">
        {/* Top Navigation Bar without cart icon */}
        <TopNavBar 
          hideLogo={true}
          hideSearch={true}
          hideCart={true}
          pageTitle="سلة التسوق"
        />

        {/* Main Content with proper spacing */}
        <div className={`${!isMobile ? 'mt-24' : 'mt-6'} py-4 pb-32`} dir="rtl">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="64" 
                height="64" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-gray-300 mb-4"
              >
                <circle cx="8" cy="21" r="1"></circle>
                <circle cx="19" cy="21" r="1"></circle>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-500 mb-1">لم تقم بإضافة أي منتجات بعد</h3>
              <p className="text-sm text-gray-400 mb-4">لم تقم بإضافة أي منتجات بعد</p>
              <Link to="/" className="bg-primary text-white px-4 py-2 rounded-md">
                تسوق الآن
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg mb-4 order-1">
                {items.map(item => (
                  <div 
                    key={`${item.product.id}-${item.is_bulk ? 'bulk' : 'regular'}`} 
                    className="flex items-center p-3 border-b last:border-b-0"
                  >
                    <div className="relative">
                      <img 
                        src={getProductImage(item)} 
                        alt={item.product.name} 
                        className="h-16 w-16 object-contain ml-3" 
                      />
                      {item.is_bulk && (
                        <div className="absolute bottom-0 right-0 bg-primary text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                          {item.product.bulk_quantity}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/product/${item.product.id}`} 
                          className="font-semibold text-sm line-clamp-1"
                        >
                          {item.product.name}
                        </Link>
                        {item.is_bulk && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            جملة
                          </Badge>
                        )}
                        {item.unit_of_measure === 'weight' && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Scale className="w-3 h-3" />
                            وزن
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center mt-1">
                        {item.is_bulk ? (
                          <span className="text-sm font-bold text-primary">
                            {item.product.bulk_price} ج.م (سعر الوحدة)
                          </span>
                        ) : item.unit_of_measure === 'weight' ? (
                          <span className="text-sm font-bold">
                            {item.product.price} ج.م/كجم
                          </span>
                        ) : item.product.offer_price ? (
                          <>
                            <span className="text-sm font-bold text-primary ml-2">
                              {item.product.offer_price} ج.م
                            </span>
                            <span className="text-xs line-through text-gray-500">
                              {item.product.price} ج.م
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold">
                            {item.product.price} ج.م
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center mr-3">
                      <div className="flex items-center justify-between bg-gray-100 rounded-lg mb-2">
                        {item.unit_of_measure === 'weight' ? (
                          <div 
                            onClick={() => handleQuantityClick(item.product.id, item.unit_of_measure)} 
                            className="px-4 py-2 cursor-pointer flex items-center gap-2"
                          >
                            <span className="font-medium">{item.quantity}جم</span>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleDecreaseQuantity(item.product.id, item.is_bulk)} 
                              className="p-1" 
                              aria-label="تقليل الكمية"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="mx-2 font-medium">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => handleIncreaseQuantity(item.product.id, item.is_bulk)} 
                              className="p-1" 
                              aria-label="زيادة الكمية"
                            >
                              <Plus size={16} />
                            </button>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        <button 
                          onClick={() => handleRemoveItem(item.product.id, item.is_bulk)} 
                          className="text-red-500" 
                          aria-label="حذف المنتج"
                        >
                          <Trash2 size={16} />
                        </button>
                        <span className="mr-2 font-semibold text-green-700">
                          {getItemTotal(item).toFixed(2)} ج.م
                        </span>
                      </div>
                      
                      {item.is_bulk && item.product.bulk_quantity && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.quantity} × {item.product.bulk_quantity} = {item.quantity * item.product.bulk_quantity} قطعة
                        </div>
                      )}
                    </div>
                    
                    {openWeightSelector === item.product.id && (
                      <WeightSelector 
                        product={item.product} 
                        isOpen={true} 
                        onClose={() => setOpenWeightSelector(null)} 
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4 order-2">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold">عنوان التوصيل</h3>
                    {user ? (
                      <Button 
                        variant="ghost" 
                        onClick={() => navigate('/address-manager')} 
                        className="text-primary"
                      >
                        {customerData?.default_address ? 'تغيير العنوان' : 'إضافة عنوان'}
                      </Button>
                    ) : (
                      <AddressSelector onAddressSelect={(addressData) => {
                        toast({
                          title: "تم تحديد العنوان",
                          description: "تم تحديد عنوان التوصيل بنجاح"
                        });
                      }}>
                        <Button variant="ghost" className="text-primary">
                          اختر العنوان
                        </Button>
                      </AddressSelector>
                    )}
                  </div>
                  
                  {user && customerData?.default_address ? (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium">
                        {customerData.default_address.areas?.name || ''} - {customerData.default_address.neighborhoods?.name || ''}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {customerData.default_address.address}
                      </p>
                    </div>
                  ) : !user && localStorage.getItem('selectedAddress') ? (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">تم تحديد العنوان</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">لم يتم تحديد عنوان بعد</p>
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-4">ملخص الطلب</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>قيمة المنتجات</span>
                      <span>{getTotalPrice().toFixed(2)} ج.م</span>
                    </div>
                    
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>الإجمالي</span>
                      <span>{getTotalPrice().toFixed(2)} ج.م</span>
                    </div>
                    
                    <Button 
                      onClick={handleProceedToCheckout}
                      className="w-full mt-4 bg-primary text-white py-3 rounded-lg"
                      disabled={items.length === 0}
                    >
                      إتمام الطلب
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Cart;