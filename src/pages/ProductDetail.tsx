
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Plus, Minus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { Product, Company, getProductById, getRelatedProducts, getCompanyById } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, addToCart, updateQuantity } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const cartItem = items.find(item => item.product.id === product?.id);
  const quantity = cartItem?.quantity || 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        const productData = await getProductById(id);
        if (!productData) {
          throw new Error('Product not found');
        }
        setProduct(productData as Product);

        const [companyData, relatedProductsData] = await Promise.all([
          getCompanyById(productData.company_id), 
          getRelatedProducts(id, productData.category_id)
        ]);
        
        setCompany(companyData as Company);
        setRelatedProducts(relatedProductsData as Product[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
    }
  };

  const handleIncreaseQuantity = () => {
    if (product) {
      updateQuantity(product.id, quantity + 1);
    }
  };

  const handleDecreaseQuantity = () => {
    if (product) {
      updateQuantity(product.id, quantity - 1);
    }
  };

  const getProductImage = (product: Product) => {
    return product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : '/placeholder.svg';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="py-4">
          <div className="flex items-center mb-4">
            <button onClick={handleBack} className="p-2" aria-label="الرجوع">
              <ArrowRight size={24} />
            </button>
            <h1 className="text-xl font-bold flex-1 text-center">المنتج غير موجود</h1>
            <div className="w-10"></div>
          </div>
          
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">عفواً، المنتج المطلوب غير موجود</p>
            <button onClick={handleBack} className="bg-primary text-white px-4 py-2 rounded-md">
              الرجوع
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="py-4 px-4">
        <div className="flex items-center mb-4">
          <button onClick={handleBack} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <div className="flex-1"></div>
          {product && (
            <FavoriteButton 
              productId={product.id} 
              size="lg" 
              variant="filled"
              className="ml-2" 
            />
          )}
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 flex justify-center">
          <img src={getProductImage(product)} alt={product.name} className="max-h-64 object-contain" />
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="text-xl font-bold mb-2">{product.name}</h2>
          
          <div className="mb-4">
            {product.offer_price ? (
              <div className="flex items-center">
                <span className="text-lg font-bold text-primary ml-2">
                  {product.offer_price} ر.س
                </span>
                <span className="text-sm line-through text-gray-500">
                  {product.price} ر.س
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold">
                {product.price} ر.س
              </span>
            )}
          </div>
          
          {company && (
            <Link to={`/company/${company.id}`} className="flex items-center bg-gray-50 p-3 rounded-lg mb-4">
              <div className="mr-auto flex items-center">
                <span className="text-sm font-medium">{company.name}</span>
                <img src={company.logo_url} alt={company.name} className="w-10 h-10 object-contain ml-2" />
              </div>
            </Link>
          )}
          
          <div className="mb-4">
            <h3 className="text-md font-semibold mb-2">الوصف</h3>
            <p className="text-sm text-gray-600">{product.description}</p>
          </div>
          
          <div className="mt-6">
            {quantity === 0 ? (
              <button 
                onClick={handleAddToCart} 
                className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
              >
                <Plus size={20} className="ml-2" />
                إضافة إلى السلة
              </button>
            ) : (
              <div className="flex items-center justify-between bg-primary text-white py-2 px-4 rounded-lg">
                <button onClick={handleIncreaseQuantity} className="p-1" aria-label="زيادة الكمية">
                  <Plus size={20} />
                </button>
                <span className="text-lg font-medium mx-4">{quantity}</span>
                <button onClick={handleDecreaseQuantity} className="p-1" aria-label="تقليل الكمية">
                  <Minus size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 text-right">منتجات مشابهة</h3>
            <div className="grid grid-cols-2 gap-3">
              {relatedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProductDetail;
