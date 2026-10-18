import type { MarketplaceProduct } from '@/lib/marketplace';

/** Existing published demo restaurant. Preview-only: no synthetic orders or checkout. */
export const DEMO_RESTAURANT_BRANCH_ID = '8d85290d-76fa-4aff-bf9c-fa46011bac95';

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=960&q=78`;

// Illustrative food photography, not photographs of the demo merchant's dishes.
// Photos are also seeded on the existing demo products in Super Business.
export const DEMO_RESTAURANT_PHOTOS: Record<string, string> = {
  '86536af1-bc41-47c7-b785-7fb9465062ca': photo('photo-1568901346375-23c9450c58cd'), // burger
  'f11c3dd5-c1a8-4a2e-af58-dc3e34d2e368': photo('photo-1529006557810-274b9b2fc783'), // shawarma
  'e91c53e1-3845-45c6-802b-1fc174a8adc1': photo('photo-1529006557810-274b9b2fc783'), // shawarma
  'c18f0546-d814-4ba1-aa56-6a140ff87454': photo('photo-1593001874117-c99c800e3ebc'), // falafel
  '651034ed-faf7-4a3a-a83a-25ce36308673': photo('photo-1532550907401-a500c9a57435'), // chicken
  '4e095d01-89aa-4210-b376-2b29e49611f8': photo('photo-1529042410759-befb1204b468'), // grilled meat
  '9997be51-4f26-4dfa-935f-aee2deb62d1a': photo('photo-1512058564366-18510be2db19'), // rice
  '01f7bd46-8bf7-4eae-8a7c-30042914e0c1': photo('photo-1630384060421-cb20d0e0649d'), // fries
  '94341733-e105-485c-98ba-ade5fb6a5c9c': photo('photo-1512621776951-a57141f2eefd'), // salad
  'cf82c961-d460-44aa-a9c8-12a05598121d': photo('photo-1473093295043-cdd812d0e601'), // pasta
  '2ecdf15e-2ef4-4c7c-8419-4cddb8b19539': photo('photo-1546173159-315724a31696'), // mango drink
  '60948fbc-78aa-4020-8bac-17cf011727ae': photo('photo-1513558161293-cdaf765edfd4'), // lemonade
};

export const DEMO_RESTAURANT_CUSTOMIZABLE = new Set([
  '86536af1-bc41-47c7-b785-7fb9465062ca',
  'f11c3dd5-c1a8-4a2e-af58-dc3e34d2e368',
]);

export type DemoRestaurantCategory = 'السندوتشات' | 'الوجبات' | 'الجانبيات' | 'المشروبات';

export const DEMO_RESTAURANT_CATEGORIES: DemoRestaurantCategory[] =
  ['السندوتشات', 'الوجبات', 'الجانبيات', 'المشروبات'];

export function demoRestaurantCategory(product: Pick<MarketplaceProduct, 'name'>): DemoRestaurantCategory {
  const name = product.name || '';
  if (/عصير|مشروب|مياه|ليمون|مانجو/.test(name)) return 'المشروبات';
  if (/بطاطس|سلطة/.test(name)) return 'الجانبيات';
  if (/وجبة|طبق|مكرونة|أرز/.test(name)) return 'الوجبات';
  return 'السندوتشات';
}

export function demoRestaurantImage(product: Pick<MarketplaceProduct, 'id' | 'image_urls'>): string | undefined {
  return product.image_urls?.find(Boolean) || DEMO_RESTAURANT_PHOTOS[product.id];
}
