
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Scale, Plus, Minus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import CompanyCard from '@/components/ui/CompanyCard';
import WeightSelector from '@/components/ui/WeightSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/useCart';
import { Product, getProductById, getRelatedProducts, getCompanyById, Company } from '@/lib/supabase';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isWeightSelectorOpen, setIsWeightSelectorOpen] = useState(false);
  const { addToCart, items, updateQuantity } = useCart();
  const { toast } = useToast();

  // البحث عن المنتج في السلة (جملة وعادي)
  const regularCartItem = items.find(item => 
    item.product.id === id && !item.is_bulk
  );
  const bulkCartItem = items.find(item => 
    item.product.id === id && item.is_bulk
  );

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getProductById(id);
        setProduct(data as Product);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const fetchCompany = async () => {
    if (!product) return;
    try {
      const data = await getCompanyById(product.company_id);
      setCompany(data);
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!product) return;
      try {
        const data = await getRelatedProducts(product.id, product.main_category_id);
        setRelatedProducts(data);
      } catch (error) {
        console.error('Error fetching related products:', error);
      }
    };

    if (product) {
      fetchRelatedProducts();
      fetchCompany();
    }
  }, [product]);

  const handleAddToCart = (isBulk: boolean = false) => {
    if (!product) return;
    
    if (product.barcode_type === 'scale') {
      setIsWeightSelectorOpen(true);
      return;
    }

    // تحديد العنصر الموجود بالفعل في السلة
    const cartItem = isBulk ? bulkCartItem : regularCartItem;

    // إذا كان المنتج موجود بالفعل، قم بتحديث الكمية
    if (cartItem) {
      updateQuantity(product.id, cartItem.quantity + quantity, isBulk);
      toast({
        title: "تم التحديث",
        description: "تم تحديث الكمية في السلة",
      });
      return;
    }

    addToCart({
      ...product,
      price: isBulk ? (product.bulk_price || 0) : (product.price || 0),
      quantity: quantity,
      is_bulk: isBulk
    });

    toast({
      title: "تم الإضافة",
      description: "تم إضافة المنتج إلى السلة",
    });
  };

  const handleIncreaseQuantity = () => {
    if (!product) return;
    setQuantity(prev => prev + 1);
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // التحقق مما إذا كان البيع بالجملة متاحًا
  const isBulkAvailable = product && 
    product.bulk_enabled && 
    product.bulk_quantity && 
    product.bulk_price &&
    quantity >= product.bulk_quantity;

  // زيادة كمية منتج موجود بالفعل في السلة
  const handleIncreaseCartQuantity = (isProductBulk: boolean) => {
    if (!product) return;
    const item = isProductBulk ? bulkCartItem : regularCartItem;
    
    if (item) {
      updateQuantity(product.id, item.quantity + 1, isProductBulk);
      toast({
        title: "تم التحديث",
        description: "تم تحديث الكمية",
      });
    }
  };

  // تقليل كمية منتج موجود بالفعل في السلة
  const handleDecreaseCartQuantity = (isProductBulk: boolean) => {
    if (!product) return;
    const item = isProductBulk ? bulkCartItem : regularCartItem;
    
    if (item && item.quantity > 1) {
      updateQuantity(product.id, item.quantity - 1, isProductBulk);
      toast({
        title: "تم التحديث",
        description: "تم تحديث الكمية",
      });
    } else if (item) {
      updateQuantity(product.id, 0, isProductBulk);
      toast({
        title: "تم الحذف",
        description: "تم حذف المنتج من السلة",
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-screen">
          Product not found.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative">
            {product.image_urls && product.image_urls.length > 0 ? (
              <img src={product.image_urls[0]} alt={product.name} className="w-full rounded-lg" />
            ) : (
              <img src="/placeholder.svg" alt="Placeholder" className="w-full rounded-lg" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
            <p className="text-gray-600 mb-4">{product.description}</p>
            
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                {product.barcode_type === 'scale' ? (
                  <span className="text-primary font-bold text-lg block">{product.price} ج.م/كجم</span>
                ) : product.offer_price ? (
                  <>
                    <span className="text-gray-400 line-through block">{product.price} ج.م</span>
                    <span className="text-primary font-bold text-lg block">{product.offer_price} ج.م</span>
                  </>
                ) : (
                  <span className="text-primary font-bold text-lg block">{product.price} ج.م</span>
                )}

                {product.bulk_enabled && product.bulk_price && product.bulk_quantity && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      سعر الجملة: {product.bulk_price} ج.م (للوحدة عند شراء {product.bulk_quantity} قطعة أو أكثر)
                    </Badge>
                  </div>
                )}
              </div>
              {company && <CompanyCard company={company} />}
            </div>

            {product.quantity <= 0 ? (
              <div className="bg-red-100 text-red-600 p-3 rounded-md mb-4">
                هذا المنتج غير متوفر حاليًا
              </div>
            ) : (
              <div className="text-green-600 mb-4">
                متوفر: {product.quantity} قطعة
              </div>
            )}

            <div className="space-y-4 mt-6">
              {product.barcode_type === 'scale' ? (
                <Button 
                  onClick={() => setIsWeightSelectorOpen(true)}
                  className="w-full flex items-center gap-2"
                  disabled={product.quantity <= 0}
                >
                  <Scale className="w-4 h-4" />
                  تحديد الوزن
                </Button>
              ) : regularCartItem ? (
                <div className="flex items-center justify-between bg-primary text-white rounded-lg p-2">
                  <button 
                    onClick={() => handleDecreaseCartQuantity(false)} 
                    className="p-2 hover:bg-primary-foreground/10 rounded"
                    aria-label="تقليل الكمية"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="mx-2">{regularCartItem.quantity}</span>
                  <button 
                    onClick={() => handleIncreaseCartQuantity(false)}
                    className="p-2 hover:bg-primary-foreground/10 rounded"
                    aria-label="زيادة الكمية"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <button 
                      onClick={handleDecreaseQuantity}
                      className="p-2 hover:bg-gray-100"
                      aria-label="تقليل الكمية"
                      disabled={product.quantity <= 0}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="px-4 font-medium">{quantity}</span>
                    <button 
                      onClick={handleIncreaseQuantity}
                      className="p-2 hover:bg-gray-100"
                      aria-label="زيادة الكمية"
                      disabled={product.quantity <= 0}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <Button 
                    onClick={() => handleAddToCart(false)} 
                    className="flex-1"
                    disabled={product.quantity <= 0}
                  >
                    إضافة للسلة
                  </Button>
                </div>
              )}

              {isBulkAvailable && (
                bulkCartItem ? (
                  <div className="flex items-center justify-between bg-[#d3ffb3] text-[#005931] rounded-lg p-2 mt-2">
                    <button 
                      onClick={() => handleDecreaseCartQuantity(true)} 
                      className="p-2 hover:bg-[#c3ef93]/50 rounded"
                      aria-label="تقليل الكمية"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="flex items-center mx-2">
                      <Package className="w-4 h-4 ml-1" />
                      <span>{bulkCartItem.quantity}</span>
                    </div>
                    <button 
                      onClick={() => handleIncreaseCartQuantity(true)}
                      className="p-2 hover:bg-[#c3ef93]/50 rounded"
                      aria-label="زيادة الكمية"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleAddToCart(true)} 
                    variant="secondary"
                    className="w-full flex items-center gap-2 bg-[#d3ffb3] text-[#005931] hover:bg-[#c3ef93]"
                    disabled={product.quantity < product.bulk_quantity}
                  >
                    <Package className="w-4 h-4" />
                    شراء جملة ({product.bulk_quantity} قطعة × {product.bulk_price} ج.م)
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {product.barcode_type === 'scale' && (
          <WeightSelector
            product={product}
            isOpen={isWeightSelectorOpen}
            onClose={() => setIsWeightSelectorOpen(false)}
          />
        )}

        {relatedProducts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">منتجات ذات صلة</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProductDetail;
