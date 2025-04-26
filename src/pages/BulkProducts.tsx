
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Package } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import { Product, getProducts, getSubcategories, Subcategory } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

const BulkProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allProducts, allSubcategories] = await Promise.all([
          getProducts(),
          getSubcategories()
        ]);
        
        // Filter only products with bulk enabled
        const bulkProducts = allProducts.filter(product => 
          product.bulk_enabled && 
          product.bulk_quantity && 
          product.bulk_price &&
          product.quantity >= product.bulk_quantity && // Only show products with enough quantity
          (!selectedSubcategory || product.subcategory_id === selectedSubcategory)
        );
        
        setProducts(bulkProducts);
        setSubcategories(allSubcategories);
      } catch (error) {
        console.error('Error fetching bulk products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSubcategory]);

  return (
    <MainLayout>
      <div className="container px-0 py-0">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center flex items-center justify-center">
            <Package className="ml-2" size={20} />
            منتجات الجملة
          </h1>
          <div className="w-10"></div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <Badge
            variant={selectedSubcategory === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedSubcategory(null)}
          >
            الكل
          </Badge>
          {subcategories.map((subcat) => (
            <Badge
              key={subcat.id}
              variant={selectedSubcategory === subcat.id ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedSubcategory(subcat.id)}
            >
              {subcat.name}
            </Badge>
          ))}
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
                showBulkQuantity={true}
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
