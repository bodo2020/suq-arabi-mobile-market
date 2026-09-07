import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Scale, Plus, Minus, Share2 } from 'lucide-react';
import TopNavBar from '@/components/layout/TopNavBar';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import CompanyCard from '@/components/ui/CompanyCard';
import WeightSelector from '@/components/ui/WeightSelector';
import ProductStructuredData from '@/components/seo/ProductStructuredData';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/useCart';
import { Product, getProductById, getRelatedProducts, getCompanyById, Company } from '@/lib/supabase';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWeightSelectorOpen, setIsWeightSelectorOpen] = useState(false);
  const { addToCart, items, updateQuantity, isInitialized } = useCart();
  const { toast } = useToast();

  // البحث عن المنتج في السلة (جملة وعادي)
  const regularCartItem = items.find(item => item.product.id === id && !item.is_bulk);
  const bulkCartItem = items.find(item => item.product.id === id && item.is_bulk);

  useEffect(() => {
    let active = true;
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      setProduct(null);
      setSelectedImageIndex(0);
      setRelatedProducts([]);
      setCompany(null);
      try {
        const data = await getProductById(id);
        if (active) setProduct(data as Product);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProduct();
    return () => { active = false; };
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
    if (!product || !isInitialized) return;
    if ((product.barcode_type === 'scale' || product.unit_of_measure === 'weight')) {
      setIsWeightSelectorOpen(true);
      return;
    }

    // Calculate total quantity in cart for this product
    const totalInCart = items.reduce((total, item) => {
      if (item.product.id === product.id) {
        if (item.is_bulk) {
          return total + (item.quantity * (item.product.bulk_quantity || 1));
        }
        return total + item.quantity;
      }
      return total;
    }, 0);

    const quantityToAdd = isBulk ? (product.bulk_quantity || 1) : quantity;

    if (totalInCart + quantityToAdd > product.quantity) {
      toast({
        title: "تنبيه",
        description: "الكمية المطلوبة غير متوفرة",
        variant: "destructive"
      });
      return;
    }

    addToCart({
      ...product,
      price: isBulk ? product.bulk_price || 0 : product.price || 0,
      quantity: isBulk ? 1 : quantity, // packs for bulk, pieces for regular
      is_bulk: isBulk
    });
    toast({
      title: "تم الإضافة",
      description: "تم إضافة المنتج إلى السلة"
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

  // مشاركة المنتج
  const handleShare = async () => {
    const { getCurrentUrl } = await import('@/utils/urlUtils');
    const shareUrl = getCurrentUrl();

    if (navigator.share && navigator.canShare) {
      try {
        await navigator.share({
          title: product?.name || 'منتج',
          text: product?.description || '',
          url: shareUrl,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.log('Error sharing:', error);
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    const { getCurrentUrl } = await import('@/utils/urlUtils');
    const shareUrl = getCurrentUrl();

    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "تم النسخ",
        description: "تم نسخ رابط المنتج"
      });
    }).catch(() => {
      toast({
        title: "خطأ",
        description: "لم يتم نسخ الرابط، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    });
  };

  // التحقق مما إذا كان البيع بالجملة متاحًا
  const isBulkAvailable = product && product.bulk_enabled && product.bulk_quantity && product.bulk_price;
  const canPurchaseBulk = isBulkAvailable && product.quantity >= product.bulk_quantity;

  // زيادة كمية منتج موجود بالفعل في السلة
  const handleIncreaseCartQuantity = (isProductBulk: boolean) => {
    if (!product || !isInitialized) return;
    const item = isProductBulk ? bulkCartItem : regularCartItem;
    if (item) {
      const totalInCart = items.reduce((total, cartItem) => {
        if (cartItem.product.id === product.id) {
          if (cartItem.is_bulk) {
            return total + (cartItem.quantity * (cartItem.product.bulk_quantity || 1));
          }
          return total + cartItem.quantity;
        }
        return total;
      }, 0);

      const quantityToAdd = isProductBulk ? (product.bulk_quantity || 1) : 1;

      if (totalInCart + quantityToAdd <= product.quantity) {
        updateQuantity(product.id, item.quantity + 1, isProductBulk);
        toast({
          title: "تم التحديث",
          description: "تم تحديث الكمية"
        });
      } else {
        toast({
          title: "تنبيه",
          description: "الكمية المطلوبة غير متوفرة",
          variant: "destructive"
        });
      }
    }
  };

  // تقليل كمية منتج موجود بالفعل في السلة
  const handleDecreaseCartQuantity = (isProductBulk: boolean) => {
    if (!product || !isInitialized) return;
    const item = isProductBulk ? bulkCartItem : regularCartItem;
    if (item && item.quantity > 1) {
      updateQuantity(product.id, item.quantity - 1, isProductBulk);
      toast({
        title: "تم التحديث",
        description: "تم تحديث الكمية"
      });
    } else if (item) {
      updateQuantity(product.id, 0, isProductBulk);
      toast({
        title: "تم الحذف",
        description: "تم حذف المنتج من السلة"
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <TopNavBar
          pageTitle="تفاصيل المنتج"
          showBackButton={true}
          onBack={() => navigate(-1)}
        />
        <div className="flex justify-center items-center h-screen">
          <BrandLoader size="md" className="" />
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <TopNavBar
          pageTitle="تفاصيل المنتج"
          showBackButton={true}
          onBack={() => navigate(-1)}
        />
        <div className="flex justify-center items-center h-screen">
          <p className="text-gray-600">المنتج غير موجود</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEOHead
        title={`${product.name} - المعداوي`}
        description={product.description || `اشتري ${product.name} من المعداوي`}
        image={product.image_urls?.[0]}
        type="product"
      />

      <ProductStructuredData product={product} />

      <BreadcrumbStructuredData
        items={[
          { name: "الرئيسية", url: "/" },
          { name: "المنتجات", url: "/categories" },
          { name: product.name, url: `/product/${product.id}` }
        ]}
      />

      {/* Top Navigation */}
      <TopNavBar
        pageTitle={product?.name || "تفاصيل المنتج"}
        showBackButton={true}
        onBack={() => navigate(-1)}
      />

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Product Image */}
        <div className="relative rounded-3xl border border-gray-100 bg-white p-4 sm:p-6">
          <div className="aspect-square relative overflow-hidden rounded-2xl bg-gray-50">
            <img
              src={product.image_urls?.[selectedImageIndex] || '/placeholder.svg'}
              alt={product.name}
              className="w-full h-full object-contain p-6"
            />

            {/* Share and Favorite buttons on image */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button
                onClick={handleShare}
                aria-label="مشاركة المنتج"
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>
              <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-md">
                <FavoriteButton productId={product.id} size="sm" />
              </div>
            </div>
          </div>

          {/* Image thumbnails if multiple images */}
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {product.image_urls.map((url, index) => (
                <button
                  key={index}
                  aria-label={`عرض صورة ${index + 1}`}
                  aria-pressed={selectedImageIndex === index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 ${
                    selectedImageIndex === index ? 'border-primary' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={url}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-7">
          <h1 className="text-2xl sm:text-3xl font-bold leading-relaxed text-gray-900 mb-3">{product.name}</h1>
          <p className="text-sm text-gray-500 mb-4">اختار الكمية المناسبة ليك وكمّل تسوقك</p>

          {/* Price and Company Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-green-50/60 p-4 mb-4">
            <div className="space-y-2">
              {(product.barcode_type === 'scale' || product.unit_of_measure === 'weight') ? (
                <span className="text-primary font-bold text-3xl block">{product.price} ج.م/كجم</span>
              ) : product.offer_price ? (
                <>
                  <span className="text-gray-400 line-through block">{product.price} ج.م</span>
                  <span className="text-primary font-bold text-3xl block">{product.offer_price} ج.م</span>
                </>
              ) : (
                <span className="text-primary font-bold text-3xl block">{product.price} ج.م</span>
              )}

              {product.bulk_enabled && product.bulk_price && product.bulk_quantity && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    عبوة {product.bulk_quantity} قطعة بسعر {product.bulk_price} ج.م
                  </Badge>
                </div>
              )}
            </div>
            {company && (
              <button
                onClick={() => navigate(`/company/${company.id}`)}
                className="text-green-600 font-medium underline hover:text-green-700 transition-colors"
              >
                {company.name}
              </button>
            )}
          </div>

          {/* Stock Status */}
          {product.quantity <= 0 ? (
            <div className="bg-red-100 text-red-600 p-3 rounded-md mb-4">
              هذا المنتج غير متوفر حاليًا
            </div>
          ) : product.quantity > 2 ? (
            <div className="text-green-600 mb-4">
              متوفر
            </div>
          ) : (
            <div className="text-orange-600 mb-4">
              متوفر حاليًا
            </div>
          )}

          <div className="space-y-4 mt-6 rounded-2xl border border-gray-100 p-3">
              {(product.barcode_type === 'scale' || product.unit_of_measure === 'weight') ? (
                <Button
                  onClick={() => setIsWeightSelectorOpen(true)}
                  className="w-full flex items-center gap-2"
                  disabled={!isInitialized || product.quantity <= 0}
                >
                  <Scale className="w-4 h-4" />
                  تحديد الوزن
                </Button>
              ) : (
                <div className="space-y-3">
                  {/* Regular Purchase Button */}
                  {regularCartItem ? (
                    <div className="flex items-center justify-between bg-primary text-white rounded-lg p-2">
                      <button
                        onClick={() => handleDecreaseCartQuantity(false)}
                        className="min-h-11 min-w-11 flex items-center justify-center p-2 hover:bg-primary-foreground/10 rounded"
                        aria-label="تقليل الكمية"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="mx-2">{regularCartItem.quantity}</span>
                      <button
                        onClick={() => handleIncreaseCartQuantity(false)}
                        className="min-h-11 min-w-11 flex items-center justify-center p-2 hover:bg-primary-foreground/10 rounded"
                        aria-label="زيادة الكمية"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleAddToCart(false)}
                      className="w-full min-h-12 rounded-xl text-base"
                      disabled={!isInitialized || product.quantity <= 0}
                    >
                      إضافة للسلة
                    </Button>
                  )}

                  {/* Bulk Purchase Button */}
                  {isBulkAvailable && canPurchaseBulk && (
                    bulkCartItem ? (
                      <div className="flex items-center justify-between bg-[#d3ffb3] text-[#005931] rounded-lg p-2">
                        <button
                          onClick={() => handleDecreaseCartQuantity(true)}
                          className="min-h-11 min-w-11 flex items-center justify-center p-2 hover:bg-[#c3ef93]/50 rounded"
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
                          className="min-h-11 min-w-11 flex items-center justify-center p-2 hover:bg-[#c3ef93]/50 rounded"
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
                        disabled={!isInitialized || product.quantity < product.bulk_quantity}
                      >
                        <Package className="w-4 h-4" />
                        إضافة عبوة {product.bulk_quantity} قطعة · {product.bulk_price} ج.م
                      </Button>
                    )
                  )}
                </div>
              )}
          </div>
        </div>

        </div>
        {product.description && <section className="mt-5 rounded-3xl bg-white p-6"><h2 className="mb-3 text-lg font-bold">عن المنتج</h2><p className="whitespace-pre-line leading-8 text-gray-600">{product.description}</p></section>}
        <button onClick={() => navigate('/cart')} className="mt-5 w-full rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-primary">مراجعة السلة ومتابعة الطلب</button>
        {(product.barcode_type === 'scale' || product.unit_of_measure === 'weight') && (
          <WeightSelector
            product={product}
            isOpen={isWeightSelectorOpen}
            onClose={() => setIsWeightSelectorOpen(false)}
          />
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="bg-white mt-4 p-4">
            <h2 className="text-xl font-bold mb-4">منتجات ذات صلة</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
              {relatedProducts.map(relatedProduct => (
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

