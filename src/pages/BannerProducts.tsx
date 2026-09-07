import BrandLoader from '@/components/ui/BrandLoader';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import ProductListStructuredData from '@/components/seo/ProductListStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight } from 'lucide-react';

const BannerProducts = () => {
  const { id } = useParams<{ id: string }>();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      // الحصول على البانر لجلب المنتجات الخاصة به
      const { data: banner } = await supabase.from('banners').select('*').eq('id', id).single();
      if (banner && banner.products && Array.isArray(banner.products)) {
        // الاستعلام عن المنتجات حسب الـ ids في المنتجات للبانر
        const { data: productsList } = await supabase.from('products').select('*').in('id', banner.products);
        setProducts(productsList ?? []);
      } else {
        setProducts([]);
      }
      setLoading(false);
    };
    if (id) fetchProducts();
  }, [id]);

  return (
    <MainLayout>
      <SEOHead 
        title="منتجات مختارة - متجرك الإلكتروني"
        description="تسوق من مجموعة منتقاة من أفضل المنتجات بأسعار مميزة"
        type="product.group"
      />
      
      {products.length > 0 && (
        <ProductListStructuredData 
          products={products} 
          listName="منتجات مختارة" 
        />
      )}
      
      <div className="py-4">
        <div className="flex items-center mb-4">
          <button className="p-2" onClick={() => navigate(-1)}>
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">منتجات البانر</h1>
          <div className="w-10"></div>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <BrandLoader size="md" className="" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 px-4">
            {products.map((product) => (
              <div key={product.id} className="flex-shrink-0">
                <ProductCard key={product.id} product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-medium text-gray-500 mb-1">لا توجد منتجات مرتبطة بهذا البانر</h3>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BannerProducts;

