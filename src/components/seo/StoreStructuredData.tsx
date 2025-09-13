
import React from 'react';
import StructuredData from './StructuredData';
import { getBaseUrl } from '@/utils/urlUtils';

interface StoreStructuredDataProps {
  baseUrl?: string;
}

const StoreStructuredData: React.FC<StoreStructuredDataProps> = ({ 
  baseUrl = getBaseUrl() 
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "متجرك الإلكتروني",
    "description": "متجر إلكتروني لبيع المنتجات مع خدمة التوصيل",
    "url": baseUrl,
    "logo": `${baseUrl}/favicon.ico`,
    "image": `${baseUrl}/favicon.ico`,
    "telephone": "+20-XXX-XXX-XXXX",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "EG",
      "addressLocality": "Cairo"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "30.0444",
      "longitude": "31.2357"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday", 
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],
        "opens": "09:00",
        "closes": "23:00"
      }
    ],
    "sameAs": [
      // يمكن إضافة روابط وسائل التواصل الاجتماعي هنا
    ],
    "priceRange": "$$",
    "currenciesAccepted": "EGP",
    "paymentAccepted": ["Cash", "Credit Card"],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Products Catalog",
      "itemListElement": []
    }
  };

  return <StructuredData data={structuredData} />;
};

export default StoreStructuredData;
