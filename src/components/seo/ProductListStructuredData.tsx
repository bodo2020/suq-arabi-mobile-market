import React from 'react';
import { Product } from '@/lib/supabase';
import StructuredData from './StructuredData';

interface ProductListStructuredDataProps {
  products: Product[];
  listName: string;
  baseUrl?: string;
}

const ProductListStructuredData: React.FC<ProductListStructuredDataProps> = ({ 
  products, 
  listName,
  baseUrl = window.location.origin 
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": listName,
    "description": `قائمة ${listName} في متجرك الإلكتروني`,
    "url": window.location.href,
    "numberOfItems": products.length,
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "@id": `${baseUrl}/product/${product.id}`,
        "name": product.name,
        "description": product.description || product.name,
        "image": product.image_urls && product.image_urls.length > 0 
          ? product.image_urls.map(url => url.startsWith('http') ? url : `${baseUrl}${url}`)
          : [`${baseUrl}/placeholder.svg`],
        "url": `${baseUrl}/product/${product.id}`,
        "sku": product.barcode || product.id,
        "gtin": product.barcode || undefined,
        "brand": {
          "@type": "Brand",
          "name": "متجرك"
        },
        "offers": {
          "@type": "Offer",
          "url": `${baseUrl}/product/${product.id}`,
          "priceCurrency": "EGP",
          "price": String(product.offer_price || product.price),
          "availability": product.quantity > 0 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock",
          "itemCondition": "https://schema.org/NewCondition",
          "seller": {
            "@type": "Organization",
            "name": "متجرك",
            "url": baseUrl
          }
        }
      }
    }))
  };

  return <StructuredData data={structuredData} />;
};

export default ProductListStructuredData;