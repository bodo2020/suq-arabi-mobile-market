import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Mail, MapPin, Package, Phone, Search, SlidersHorizontal } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import MainCategoryProductSections from '@/components/sections/MainCategoryProductSections';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import SEOHead from '@/components/seo/SEOHead';
import ProductListStructuredData from '@/components/seo/ProductListStructuredData';
import { Company, Product, getCompanyById, getProductsByCompany } from '@/lib/supabase';
import {
  DisplayProduct,
  displayProductName,
  displayProductPrice,
  expandProductSaleUnits,
} from '@/lib/productPurchase';

type SortType = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

const sortProducts = (items: DisplayProduct[], sort: SortType) => {
  const copy = [...items];
  if (sort === 'price_asc') return copy.sort((a, b) => displayProductPrice(a) - displayProductPrice(b));
  if (sort === 'price_desc') return copy.sort((a, b) => displayProductPrice(b) - displayProductPrice(a));
  if (sort === 'name_asc') return copy.sort((a, b) => displayProductName(a).localeCompare(displayProductName(b), 'ar'));
  return copy.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
};

const CompanyProducts = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [allProducts, setAllProducts] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortType>('newest');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const [companyData, productsData] = await Promise.all([
        getCompanyById(id),
        getProductsByCompany(id),
      ]);
      if (!companyData) throw new Error('Company not found');
      setCompany(companyData as Company);
      setAllProducts(expandProductSaleUnits((productsData || []) as Product[]));
    } catch (loadError) {
      console.error('Error loading company page:', loadError);
      setCompany(null);
      setAllProducts([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const products = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ar');
    const filtered = query
      ? allProducts.filter(product => displayProductName(product).toLocaleLowerCase('ar').includes(query))
      : allProducts;
    return sortProducts(filtered, sort);
  }, [allProducts, search, sort]);

  const companyInitial = company?.name?.trim()?.charAt(0) || 'ش';

  return (
    <MainLayout>
      <SEOHead
        title={company ? `${company.name} - ســــــوبـرمــــاركو` : 'الشركة - ســــــوبـرمــــاركو'}
        description={company?.description || (company ? `تسوق منتجات ${company.name} من ســــــوبـرمــــاركو` : 'تسوق منتجات الشركات من ســــــوبـرمــــاركو')}
        image={company?.logo_url || undefined}
        type="product.group"
      />
      {products.length > 0 && company && <ProductListStructuredData products={products} listName={`منتجات ${company.name}`} />}

      <TopNavBar hideLogo hideSearch hideCart pageTitle={company?.name || 'الشركة'} showBackButton onBack={() => navigate(-1)} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center"><BrandLoader label="جاري تحميل منتجات الشركة" /></div>
        ) : error || !company ? (
          <section role="alert" className="mx-auto max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Building2 size={30} /></span>
            <h1 className="mt-4 text-xl font-bold">تعذر تحميل الشركة</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">راجع اتصالك وحاول مرة تانية.</p>
            <Button className="mt-5 rounded-xl" onClick={() => void load()}>إعادة المحاولة</Button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-[#d8ebdf] bg-gradient-to-b from-[#eaf6ee] via-white to-[#fff5d3] p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-[#d8ebdf] bg-white shadow-sm">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={`شعار ${company.name}`} className="h-full w-full object-contain p-2" loading="eager" onError={event => { event.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <span className="text-3xl font-black text-primary">{companyInitial}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary">تسوق حسب الشركة</p>
                  <h1 className="mt-1 break-words text-2xl font-bold text-gray-900 sm:text-3xl">{company.name}</h1>
                  {company.description && <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-gray-600">{company.description}</p>}
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#fff5d3] px-3 py-2 text-sm font-bold text-[#005931]">
                    <Package size={17} className="text-primary" />{allProducts.length.toLocaleString('ar-EG')} اختيار متاح
                  </div>
                </div>
              </div>

              {(company.contact_phone || company.contact_email || company.address) && (
                <div className="mt-5 grid gap-2 border-t border-[#d8ebdf] pt-5 sm:grid-cols-3">
                  {company.contact_phone && (
                    <a dir="ltr" href={`tel:${company.contact_phone}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#c8e0d2] bg-white px-3 text-sm font-bold text-primary shadow-sm hover:bg-[#fff5d3]">
                      <Phone size={17} /><span>{company.contact_phone}</span>
                    </a>
                  )}
                  {company.contact_email && (
                    <a href={`mailto:${company.contact_email}`} className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#c8e0d2] bg-white px-3 text-sm font-bold text-primary shadow-sm hover:bg-[#fff5d3]">
                      <Mail size={17} className="shrink-0" /><span className="truncate">{company.contact_email}</span>
                    </a>
                  )}
                  {company.address && (
                    <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#c8e0d2] bg-white px-3 text-center text-sm font-bold text-[#005931] shadow-sm">
                      <MapPin size={17} className="shrink-0 text-primary" /><span>{company.address}</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[#d8ebdf] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={`دور في منتجات ${company.name}`}
                    className="h-12 w-full rounded-xl border border-[#c8e0d2] bg-white pr-10 pl-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-[#fff5d3]"
                  />
                </label>
                <label className="relative sm:w-56">
                  <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <select value={sort} onChange={event => setSort(event.target.value as SortType)} className="h-12 w-full appearance-none rounded-xl border border-[#c8e0d2] bg-white pr-10 pl-3 text-sm font-bold text-[#005931] outline-none focus:border-primary focus:ring-2 focus:ring-[#fff5d3]">
                    <option value="newest">الأحدث</option>
                    <option value="price_asc">السعر: الأقل أولًا</option>
                    <option value="price_desc">السعر: الأعلى أولًا</option>
                    <option value="name_asc">الاسم: أ - ي</option>
                  </select>
                </label>
              </div>
            </section>

            {products.length > 0 ? (
              <section>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div><p className="text-xs text-gray-500">القطعة والجملة المتاحة</p><h2 className="mt-1 text-xl font-bold">منتجات {company.name}</h2></div>
                  <span className="text-sm font-semibold text-gray-500">{products.length.toLocaleString('ar-EG')}</span>
                </div>
                <MainCategoryProductSections products={products} level="sub"/>
              </section>
            ) : (
              <section className="rounded-3xl border border-dashed border-[#c8e0d2] bg-white p-8 text-center shadow-sm">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff5d3] text-[#005931]"><Package size={30} /></span>
                <h2 className="mt-4 text-xl font-bold">{search.trim() ? 'مفيش نتائج للبحث ده' : 'مفيش منتجات للشركة حاليًا'}</h2>
                <p className="mt-2 text-sm text-gray-500">{search.trim() ? 'جرّب تكتب اسم منتج مختلف.' : 'لما تتضاف منتجات جديدة هتظهر هنا تلقائيًا.'}</p>
                {search.trim() && <Button variant="outline" className="mt-5 rounded-xl" onClick={() => setSearch('')}>مسح البحث</Button>}
              </section>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CompanyProducts;
