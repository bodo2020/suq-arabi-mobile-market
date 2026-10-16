
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getBaseUrl, getCurrentUrl } from '@/utils/urlUtils';
import { BRAND_NAME } from '@/lib/brand';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = `${BRAND_NAME} | تسوق المنتجات أونلاين`,
  description = `تسوق المنتجات والعروض من ${BRAND_NAME} أونلاين`,
  image = '/brand/super-marko-wordmark.png',
  url,
  type = "website"
}) => {
  const currentUrl = url || getCurrentUrl();
  const baseUrl = getBaseUrl();
  const fullImageUrl = image ? (image.startsWith('http') ? image : `${baseUrl}${image}`) : undefined;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {fullImageUrl && <meta property="og:image" content={fullImageUrl} />}
      
      {/* Twitter */}
      <meta property="twitter:card" content={fullImageUrl ? "summary_large_image" : "summary"} />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      {fullImageUrl && <meta property="twitter:image" content={fullImageUrl} />}
      
      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={currentUrl} />
    </Helmet>
  );
};

export default SEOHead;

