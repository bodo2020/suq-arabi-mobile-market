import React from 'react';
import { Trash2, Plus, Minus, Package, Scale, ShoppingBag, ArrowRight } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
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
  const {
    toast
  } = useToast();
  const {
    user
  } = useUser();
  const [openWeightSelector, setOpenWeightSelector] = React.useState<string | null>(null);
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
        const currentCartQuantity = getTotalUnitsInCart(productId);
        const quantityToAdd = is_bulk ? item.product.bulk_quantity || 1 : 1;
        const available = getAvailableQuantity(item.product);
        if (currentCartQuantity + quantityToAdd <= available) {
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
    return item.product.image_urls && item.product.image_urls.length > 0 ? item.product.image_urls[0] : '/placeholder.svg';
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
  // Helpers to validate stock per product
  const getAvailableQuantity = (product: any) => {
    const q = Number(product?.quantity);
    return Number.isFinite(q) ? q : Number.POSITIVE_INFINITY;
  };
  const getTotalUnitsInCart = (productId: string) => {
    return items
      .filter(i => i.product.id === productId && i.unit_of_measure !== 'weight')
      .reduce((total, i) => total + (i.is_bulk ? i.quantity * (i.product.bulk_quantity || 1) : i.quantity), 0);
  };
  const hasBlockingItems = items.some(i => {
    if (i.unit_of_measure === 'weight') return false;
    const totalUnits = getTotalUnitsInCart(i.product.id);
    const available = getAvailableQuantity(i.product);
    return available <= 0 || totalUnits > available;
  });

  const handleProceedToPayment = () => {
    // Check if user is logged in first
    if (!user) {
      navigate('/phone-login');
      return;
    }

    // Block checkout if out-of-stock items exist
    if (hasBlockingItems) {
      toast({
        title: "لا يمكن متابعة الطلب",
        description: "يرجى إزالة المنتجات غير المتوفرة أولاً",
        variant: "destructive"
      });
      return;
    }
    
    // Check if there's an address (from DB default OR homepage localStorage)
    const selectedAddressLS = localStorage.getItem('selectedAddress');
    const hasAddress = customerData?.default_address || selectedAddressLS;
    if (!hasAddress) {
      toast({
        title: "عنوان التوصيل مطلوب",
        description: "يرجى اختيار عنوان التوصيل أولاً",
        variant: "destructive"
      });
      return;
    }
    navigate('/payment');
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation Bar */}
        <TopNavBar hideLogo={true} hideSearch={true} hideCart={true} pageTitle="سلة التسوق" />

        {/* Main Content */}
        <div className={`${!isMobile ? 'mt-24' : 'mt-6'} px-4 ${items.length > 0 ? 'pb-48' : 'pb-8'}`} dir="rtl">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="bg-white rounded-full p-6 mb-6 shadow-sm">
                <ShoppingBag className="w-16 h-16 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">سلة التسوق فارغة</h3>
              <p className="text-gray-500 mb-6 text-center">لم تقم بإضافة أي منتجات بعد</p>
              <Link to="/" className="bg-primary text-white px-8 py-3 rounded-full hover:bg-primary/90 transition-colors flex items-center gap-2">
                ابدأ التسوق
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cart Items */}
              <div className="space-y-3">
                {items.map(item => (
                  <Card key={`${item.product.id}-${item.is_bulk ? 'bulk' : 'regular'}`} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="relative flex-shrink-0">
                          <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden">
                            <img 
                              src={getProductImage(item)} 
                              alt={item.product.name} 
                              className="w-full h-full object-contain" 
                            />
                          </div>
                          {item.is_bulk && (
                            <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                              {item.product.bulk_quantity}
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <Link to={`/product/${item.product.id}`} className="font-bold text-gray-900 line-clamp-2 hover:text-primary transition-colors">
                                {item.product.name}
                              </Link>
                              
                              {/* Badges */}
                              <div className="flex gap-2 mt-1">
                                {item.is_bulk && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-0">
                                    <Package className="w-3 h-3 mr-1" />
                                    جملة
                                  </Badge>
                                )}
                                {item.unit_of_measure === 'weight' && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-0">
                                    <Scale className="w-3 h-3 mr-1" />
                                    وزن
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Remove Button */}
                            <button 
                              onClick={() => handleRemoveItem(item.product.id, item.is_bulk)} 
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              aria-label="حذف المنتج"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="mb-3">
                            {item.is_bulk ? (
                              <span className="text-lg font-bold text-primary">
                                {item.product.bulk_price} ج.م
                              </span>
                            ) : item.unit_of_measure === 'weight' ? (
                              <span className="text-lg font-bold text-gray-900">
                                {item.product.price} ج.م/كجم
                              </span>
                            ) : item.product.offer_price ? (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-primary">
                                  {item.product.offer_price} ج.م
                                </span>
                                <span className="text-sm line-through text-gray-400">
                                  {item.product.price} ج.م
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-gray-900">
                                {item.product.price} ج.م
                              </span>
                            )}
                          </div>

                          {/* Stock Warning */}
                          {item.unit_of_measure !== 'weight' && (() => {
                            const available = getAvailableQuantity(item.product);
                            const totalUnits = getTotalUnitsInCart(item.product.id);
                            if (available <= 0) {
                              return (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                                  <span className="text-red-600 text-sm font-medium">نفذت الكمية، يرجى إزالة المنتج</span>
                                </div>
                              );
                            }
                            if (totalUnits > available) {
                              return (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                                  <span className="text-amber-600 text-sm font-medium">يوجد {available} قطعة فقط</span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Quantity Controls and Total */}
                          <div className="flex items-center justify-between">
                            {/* Quantity Controls */}
                            <div className="flex items-center">
                              {item.unit_of_measure === 'weight' ? (
                                <button
                                  onClick={() => handleQuantityClick(item.product.id, item.unit_of_measure)}
                                  className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
                                >
                                  <span className="font-medium text-gray-900">{item.quantity} جم</span>
                                </button>
                              ) : (
                                <div className="flex items-center bg-gray-100 rounded-lg">
                                  <button 
                                    onClick={() => handleDecreaseQuantity(item.product.id, item.is_bulk, item.unit_of_measure)} 
                                    className="p-2 hover:bg-gray-200 rounded-l-lg transition-colors"
                                    aria-label="تقليل الكمية"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="px-4 py-2 font-medium min-w-[3rem] text-center">
                                    {item.quantity}
                                  </span>
                                  <button 
                                    onClick={() => handleIncreaseQuantity(item.product.id, item.is_bulk, item.unit_of_measure)} 
                                    className="p-2 hover:bg-gray-200 rounded-r-lg transition-colors"
                                    aria-label="زيادة الكمية"
                                    disabled={item.unit_of_measure === 'weight' || getTotalUnitsInCart(item.product.id) >= getAvailableQuantity(item.product)}
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Item Total */}
                            <div className="text-right">
                              <div className="text-xl font-bold text-primary">
                                {getItemTotal(item).toFixed(2)} ج.م
                              </div>
                              {item.is_bulk && item.product.bulk_quantity && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.quantity} × {item.product.bulk_quantity} = {item.quantity * item.product.bulk_quantity} قطعة
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Remove the separate Order Summary section since it will be moved to bottom */}
            </div>
          )}
        </div>

        {/* Fixed bottom order summary and button - above bottom navigation */}
        {items.length > 0 && (
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-2xl">
            {/* Order Summary */}
            <div className="px-4 py-4 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">ملخص الطلب</h3>
                <div className="bg-primary/10 rounded-full p-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">قيمة المنتجات ({items.length} منتج)</span>
                  <span className="font-bold text-gray-900">{getTotalPrice().toFixed(2)} ج.م</span>
                </div>
                
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">الإجمالي</span>
                    <span className="text-xl font-bold text-primary">{getTotalPrice().toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Complete Order Button */}
            <div className="px-4 pb-4 pt-2 bg-white">
              <Button 
                onClick={handleProceedToPayment} 
                className="w-full bg-gradient-to-r from-primary to-primary/90 text-white py-4 rounded-xl text-lg font-bold hover:from-primary/90 hover:to-primary/80 transition-all duration-300 shadow-lg" 
                disabled={items.length === 0}
              >
                إتمام الطلب • {getTotalPrice().toFixed(2)} ج.م
              </Button>
            </div>
          </div>
        )}

        {/* Weight Selector Modal */}
        {openWeightSelector && (
          <WeightSelector 
            product={items.find(item => item.product.id === openWeightSelector)?.product!} 
            isOpen={true} 
            onClose={() => setOpenWeightSelector(null)} 
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Cart;