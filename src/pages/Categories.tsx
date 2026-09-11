import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import CategoryItem from '@/components/ui/CategoryItem';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import { MainCategory, getCategories } from '@/lib/supabase';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        if (active) setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchCategories();
    return () => { active = false; };
  }, []);

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
        <section className="mb-5 overflow-hidden rounded-[26px] border border-emerald-100 bg-gradient-to-br from-[#f1fbf6] via-white to-[#f7fbf9] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#005931] text-white shadow-sm">
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
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
              aria-label="البحث في الأقسام"
            />
          </div>
        </section>

        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="text-base font-extrabold text-slate-900">كل الأقسام</h2>
          {!loading && <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">{visibleCategories.length} قسم</span>}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {Array.from({ length: 14 }).map((_, index) => <CategorySkeleton key={index} />)}
          </div>
        ) : visibleCategories.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {visibleCategories.map(category => (
              <CategoryItem key={category.id} category={category} onClick={handleCategoryClick} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400"><Search size={22} /></div>
            <p className="font-bold text-slate-800">مفيش قسم بالاسم ده</p>
            <button type="button" onClick={() => setQuery('')} className="mt-2 text-sm font-semibold text-[#005931]">عرض كل الأقسام</button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
