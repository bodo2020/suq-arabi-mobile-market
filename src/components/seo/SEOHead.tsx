
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getBaseUrl, getCurrentUrl } from '@/utils/urlUtils';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = "سوبر ماركو | تسوق المنتجات أونلاين",
  description = "تسوق المنتجات والعروض من سوبر ماركو أونلاين",
  image = "/super-marko-icon.png",
  url,
  type = "website"
}) => {
  const currentUrl = url || getCurrentUrl();
  const baseUrl = getBaseUrl();
  const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={fullImageUrl} />
      
      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={currentUrl} />
    </Helmet>
  );
};

export default SEOHead;

