import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import CategoryItem from '@/components/ui/CategoryItem';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import { Button } from '@/components/ui/button';
import { MainCategory, getCategories } from '@/lib/supabase';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      if (active) { setLoading(true); setError(false); }
      try {
        const categoriesData = await getCategories();
        if (active) setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchCategories();
    return () => { active = false; };
  }, [retry]);

  const visibleCategories = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ar');
    if (!normalized) return categories;
    return categories.filter(category => category.name.toLocaleLowerCase('ar').includes(normalized));
  }, [categories, query]);

  const handleCategoryClick = (category: MainCategory) => {
    navigate(`/category/${category.id}`);
  };

  return (
    <MainLayout>
      <TopNavBar
        searchPlaceholder="دور على منتج أو قسم…"
        onSearchFocus={() => navigate('/search')}
        hideLogo
        pageTitle="الأقسام"
      />

      <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-2 sm:px-5">
        <section className="mb-5 overflow-hidden rounded-[26px] border border-[#d8ebdf] bg-gradient-to-br from-[#eaf6ee] via-white to-[#fff5d3] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#005931] text-[#FFC120] shadow-sm">
              <Grid3X3 size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">تسوق حسب القسم</h1>
              <p className="mt-1 text-sm leading-6 text-slate-500">اختار القسم ووصل لمنتجاتك أسرع.</p>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="ابحث باسم القسم"
              className="h-12 w-full rounded-2xl border border-[#c8e0d2] bg-white pr-11 pl-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#005931] focus:ring-4 focus:ring-[#fff5d3]"
              aria-label="البحث في الأقسام"
            />
          </div>
        </section>

        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="text-base font-extrabold text-slate-900">كل الأقسام</h2>
          {!loading && !error && <span className="rounded-full bg-[#fff5d3] px-3 py-1 text-xs font-bold text-[#005931]">{visibleCategories.length} قسم</span>}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {Array.from({ length: 14 }).map((_, index) => <CategorySkeleton key={index} />)}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-3xl border border-[#d8ebdf] bg-white px-5 py-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5d3] text-[#005931]"><Grid3X3 size={22} /></div>
            <p className="font-bold text-slate-800">تعذّر تحميل الأقسام</p>
            <p className="mt-1 text-sm text-slate-500">راجع اتصالك وحاول مرة تانية.</p>
            <Button className="mt-4" onClick={() => setRetry(value => value + 1)}>إعادة المحاولة</Button>
          </div>
        ) : visibleCategories.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {visibleCategories.map(category => (
              <CategoryItem key={category.id} category={category} onClick={handleCategoryClick} variant="modern" />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#c8e0d2] bg-white px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5d3] text-[#005931]"><Search size={22} /></div>
            <p className="font-bold text-slate-800">{query.trim() ? 'مفيش قسم بالاسم ده' : 'مفيش أقسام متاحة حاليًا'}</p>
            {query.trim() && <Button variant="outline" className="mt-3" onClick={() => setQuery('')}>عرض كل الأقسام</Button>}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
