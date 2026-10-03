const publicPages = new Set([
  '/', '/phone-login', '/phone-verify', '/register', '/forgot-password', '/update-password',
  '/categories', '/search', '/offers', '/flash-sale', '/cart', '/stores', '/bulk-products',
  '/address-manager', '/addresses', '/account', '/notifications', '/add-address', '/address', '/barcode-scanner', '/barcode-scan',
]);

export function isPublicCustomerPath(pathname: string) {
  return publicPages.has(pathname) || /^\/(product|category|company|banner|banner-products|stores)\/[^/]+(?:\/products|\/subcategory\/[^/]+)?$/.test(pathname);
}
