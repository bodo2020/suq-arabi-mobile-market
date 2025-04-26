
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Package } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import { Product, getProducts } from '@/lib/supabase';

const BulkProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const allProducts = await getProducts();
        // Filter only products with bulk enabled
        const bulkProducts = allProducts.filter(product => 
          product.bulk_enabled && 
          product.bulk_quantity && 
          product.bulk_price &&
          product.quantity >= product.bulk_quantity // Only show products with enough quantity
        );
        setProducts(bulkProducts);
      } catch (error) {
        console.error('Error fetching bulk products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <MainLayout>
      <div className="container px-0 py-0">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center flex items-center justify-center">
            <Package className="mr-2" size={20} />
            منتجات الجملة
          </h1>
          <div className="w-10"></div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                hideIfUnavailable={true} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            لا توجد منتجات جملة متاحة حاليًا
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BulkProducts;
