import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import CompanyCard from '@/components/ui/CompanyCard';
import { Product, getProductById, getRelatedProducts, getCompanyById } from '@/lib/supabase';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          {/* Product Image */}
          <div>
            {product.image_urls && product.image_urls.length > 0 ? (
              <img src={product.image_urls[0]} alt={product.name} className="w-full rounded-lg" />
            ) : (
              <img src="/placeholder.svg" alt="Placeholder" className="w-full rounded-lg" />
            )}
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
            <p className="text-gray-600 mb-4">{product.description}</p>
            <div className="flex items-center justify-between mb-4">
              <div>
                {product.offer_price ? (
                  <>
                    <span className="text-gray-400 line-through">{product.price} ج.م</span>
                    <span className="text-primary font-bold text-lg">{product.offer_price} ج.م</span>
                  </>
                ) : (
                  <span className="text-primary font-bold text-lg">{product.price} ج.م</span>
                )}
              </div>
              {company && (
                <CompanyCard company={company} />
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
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
