import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Package, Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import { Product, getProducts, getCategories } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const BulkProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allProducts, allCategories] = await Promise.all([
          getProducts(),
          getCategories()
        ]);
        
        let bulkProducts = allProducts.filter(product => 
          product.bulk_enabled && 
          product.bulk_quantity && 
          product.bulk_price &&
          product.quantity >= (product.bulk_quantity || 1) // Check if we have at least one full bulk unit
        );

        if (searchQuery) {
          bulkProducts = bulkProducts.filter(product => 
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        if (selectedCategory) {
          bulkProducts = bulkProducts.filter(product => 
            product.main_category_id === selectedCategory
          );
        }
        
        setProducts(bulkProducts);
        setCategories(allCategories);
      } catch (error) {
        console.error('Error fetching bulk products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory, searchQuery]);

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

        <div className="px-4 mb-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="ابحث عن منتجات الجملة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 px-4">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            الكل
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 px-4">
            {products.map((product) => (
              <div key={product.id} className="flex-shrink-0">
                <ProductCard 
                  key={product.id} 
                  product={{
                    ...product,
                    price: product.bulk_price || 0,
                    offer_price: undefined
                  }} 
                  hideIfUnavailable={true}
                  showBulkQuantity={true}
                />
              </div>
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
