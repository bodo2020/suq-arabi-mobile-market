import React, { useEffect, useMemo, useState } from 'react';
import VirtualProductGrid from '@/components/ui/VirtualProductGrid';
import { useNavigate } from 'react-router-dom';
import { Package, Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import BrandLoader from '@/components/ui/BrandLoader';
import { Product, getProducts, getCategories } from '@/lib/supabase';
import { hasBulkPurchase } from '@/lib/productPurchase';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const BulkProducts = () => {
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [productsData, categoriesData] = await Promise.all([getProducts(), getCategories()]);
      setAllProducts((productsData || []).filter(product => hasBulkPurchase(product)) as Product[]);
      setCategories(categoriesData || []);
    } catch (loadError) {
      console.error('Error fetching bulk products:', loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const products = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('ar');
    return allProducts.filter(product => {
      const matchesSearch = !query || product.name.toLocaleLowerCase('ar').includes(query) || product.description?.toLocaleLowerCase('ar').includes(query);
      const matchesCategory = !selectedCategory || product.main_category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchQuery, selectedCategory]);

  return (
    <MainLayout>
      <TopNavBar variant="title" hideLogo hideSearch hideCart pageTitle="منتجات الجملة" showBackButton onBack={() => navigate(-1)} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <section className="mb-5 rounded-3xl border border-green-100 bg-green-50/70 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><Package size={24} /></span>
            <div>
              <h1 className="text-2xl font-bold">منتجات الجملة</h1>
              <p className="mt-1 text-sm text-gray-600">اختار العبوة المناسبة، والتوفر النهائي بيتأكد من فرع عنوانك عند تأكيد الطلب.</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل منتجات الجملة" /></div>
        ) : error ? (
          <section role="alert" className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold">تعذر تحميل منتجات الجملة</h2>
            <p className="mt-2 text-sm text-gray-500">راجع اتصالك وحاول مرة تانية.</p>
            <Button className="mt-5 rounded-xl" onClick={() => void load()}>إعادة المحاولة</Button>
          </section>
        ) : (
          <>
            <section className="mb-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="دور في منتجات الجملة..."
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  className="h-12 rounded-xl pr-4 pl-10"
                />
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <Badge
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  className="cursor-pointer whitespace-nowrap px-3 py-2"
                  onClick={() => setSelectedCategory(null)}
                >
                  الكل
                </Badge>
                {categories.map(category => (
                  <Badge
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    className="cursor-pointer whitespace-nowrap px-3 py-2"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            </section>

            {products.length > 0 ? (
              <VirtualProductGrid
                items={products}
                getKey={product => product.id}
                renderItem={product => <ProductCard product={{ ...product, displayType: 'bulk' }} />}
              />
            ) : (
              <section className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <Package className="mx-auto text-gray-300" size={40} />
                <h2 className="mt-4 text-xl font-bold">مفيش منتجات جملة مطابقة</h2>
                <p className="mt-2 text-sm text-gray-500">غيّر البحث أو القسم وجرب تاني.</p>
                {(searchQuery || selectedCategory) && <Button variant="outline" className="mt-5 rounded-xl" onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}>عرض كل الجملة</Button>}
              </section>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default BulkProducts;
