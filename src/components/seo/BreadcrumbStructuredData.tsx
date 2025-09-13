import React from 'react';
import StructuredData from './StructuredData';
import { getBaseUrl } from '@/utils/urlUtils';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbStructuredDataProps {
  items: BreadcrumbItem[];
  baseUrl?: string;
}

const BreadcrumbStructuredData: React.FC<BreadcrumbStructuredDataProps> = ({ 
  items,
  baseUrl = getBaseUrl() 
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`
    }))
  };

  return <StructuredData data={structuredData} />;
};

export default BreadcrumbStructuredData;