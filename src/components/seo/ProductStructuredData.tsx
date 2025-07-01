
import React from 'react';
import { Product } from '@/lib/supabase';
import StructuredData from './StructuredData';

interface ProductStructuredDataProps {
  product: Product;
  baseUrl?: string;
}

const ProductStructuredData: React.FC<ProductStructuredDataProps> = ({ 
  product, 
  baseUrl = window.location.origin 
}) => {
  // إنشاء كائن العرض الأساسي
  const baseOffer = {
    "@type": "Offer",
    "url": `${baseUrl}/product/${product.id}`,
    "priceCurrency": "EGP",
    "price": product.offer_price || product.price,
    "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    "availability": product.quantity > 0 
      ? "https://schema.org/InStock" 
      : "https://schema.org/OutOfStock",
    "itemCondition": "https://schema.org/NewCondition",
    "seller": {
      "@type": "Organization",
      "name": "متجرك"
    }
  };

  // إضافة معلومات السعر الأصلي إذا كان هناك عرض
  const offers = product.offer_price && product.price && product.offer_price < product.price
    ? {
        ...baseOffer,
        "priceSpecification": {
          "@type": "PriceSpecification",
          "price": product.offer_price,
          "priceCurrency": "EGP"
        }
      }
    : baseOffer;

  const structuredData: any = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "description": product.description || product.name,
    "image": product.image_urls && product.image_urls.length > 0 
      ? product.image_urls.map(url => url.startsWith('http') ? url : `${baseUrl}${url}`)
      : [`${baseUrl}/placeholder.svg`],
    "url": `${baseUrl}/product/${product.id}`,
    "sku": product.barcode || product.id,
    "brand": {
      "@type": "Brand",
      "name": "متجرك"
    },
    "offers": offers,
    "category": product.main_category_id,
    "productID": product.id
  };

  // إضافة معلومات البيع بالجملة
  if (product.bulk_enabled && product.bulk_price && product.bulk_quantity) {
    structuredData.additionalProperty = {
      "@type": "PropertyValue",
      "name": "Bulk Price",
      "value": `${product.bulk_price} EGP for ${product.bulk_quantity} units`
    };
  }

  return <StructuredData data={structuredData} />;
};

export default ProductStructuredData;
