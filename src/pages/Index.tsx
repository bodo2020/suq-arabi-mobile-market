import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import StoreStructuredData from '@/components/seo/StoreStructuredData';
import DynamicHomeSections from '@/components/sections/DynamicHomeSections';
import UnifiedCatalogSection from '@/components/sections/UnifiedCatalogSection';
import { useCustomerDeliveryHeader } from '@/hooks/useCustomerDeliveryHeader';

const Index = () => {
  const navigate = useNavigate();
  const {
    address,
    addressLabel,
    addressLoading,
    addressError,
    deliveryEstimateMinutes,
    openAddress,
  } = useCustomerDeliveryHeader('/');

  return (
    <MainLayout>
      <StoreStructuredData />
      <TopNavBar
        homeHero
        onSearchFocus={() => navigate('/search')}
        addressLabel={addressLabel}
        addressLoading={addressLoading}
        deliveryEstimateMinutes={deliveryEstimateMinutes}
        onAddressClick={openAddress}
      />
      <div className="mx-auto max-w-7xl px-3 pb-10 pt-4 sm:px-4 md:pt-6">
        <button
          onClick={openAddress}
          className="mb-5 hidden w-full items-center gap-2 rounded-2xl md:flex border border-emerald-100 bg-white px-3 py-2 text-right transition hover:bg-brand-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={address ? 'تغيير عنوان التوصيل' : 'إضافة عنوان توصيل'}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-brand-green"><MapPin size={19} /></span>
          <span className="shrink-0 text-xs text-gray-500">التوصيل إلى</span>
            <strong className="min-w-0 truncate text-sm font-bold text-primary">
              {addressLoading
                ? 'جاري تحميل عنوانك…'
                : addressError
                  ? 'تعذّر تحميل العنوان — اضغط للمراجعة'
                  : address || 'حدد عنوانك على الخريطة'}
            </strong>
        </button>

        <DynamicHomeSections hidePromotions showBanners />
        <UnifiedCatalogSection />
      </div>
    </MainLayout>
  );
};

export default Index;
