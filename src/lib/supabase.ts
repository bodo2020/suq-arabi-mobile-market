import { supabase as configuredSupabase } from '@/integrations/supabase/client';
import { loadBranchRuntimeContext, loadSelectedDeliveryPoint } from '@/lib/branchRuntime';

export const supabase = configuredSupabase;

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  offer_price?: number;
  image_urls: string[];
  main_category_id: string;
  subcategory_id?: string;
  company_id: string;
  quantity: number;
  created_at: string;
  is_offer: boolean;
  bulk_enabled: boolean;
  bulk_quantity?: number;
  bulk_price?: number;
  bulk_name?: string | null;
  bulk_image_url?: string | null;
  bulk_variant_id?: string | null;
  unit_of_measure?: string;
  barcode_type?: string;
  default_weight_grams?: number | null;
  barcode?: string;
  bulk_barcode?: string;
  delivery_branch_id?: string;
  inventory_branch_id?: string;
  pricing_branch_id?: string;
  commerce_source?: 'owned' | 'marketplace';
  catalog_scope?: 'elmadawy' | 'partner';
  marketplace_listing_id?: string;
  merchant_id?: string;
  merchant_name?: string;
  marketplace_branch_id?: string;
  marketplace_branch_name?: string;
  preparation_minutes?: number | null;
  fallback_reason?: string;
};

export type MainCategory = {
  id: string;
  name: string;
  image_url: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

export type Category = {
  id: string;
  name: string;
  image_url: string;
  description?: string;
  level: string;
  parent_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type Subcategory = {
  id: string;
  name: string;
  image_url: string;
  description?: string;
  category_id: string;
  created_at?: string;
  updated_at?: string;
};

export type Company = {
  id: string;
  logo_url: string;
  description?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  name: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type Address = {
  id: string;
  user_id: string;
  address: string;
  governorate_id?: string | null;
  city_id?: string | null;
  area_id?: string | null;
  neighborhood_id?: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  latitude?: number | null;
  longitude?: number | null;
  assigned_branch_id?: string | null;
  distance_km?: number | null;
  is_deliverable?: boolean | null;
  governorates?: { id: string; name: string } | null;
  cities?: { id: string; name: string } | null;
  areas?: { id: string; name: string } | null;
  neighborhoods?: { id: string; name: string } | null;
};

export type Order = {
  id: string;
  customer_id?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  shipping_address?: string;
  shipping_cost?: number;
  payment_method?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  items: any;
  created_at: string;
};

export type ReturnRequestStatus = 'pending' | 'approved' | 'rejected';

export type ReturnRequest = {
  id: string;
  user_id: string;
  order_id: string;
  reason: string;
  status: ReturnRequestStatus;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  images: string[];
};

export type ReturnRequestItem = {
  id: string;
  return_request_id: string;
  product_id: string;
  quantity: number;
  reason?: string;
  created_at: string;
  products?: Product;
};

type CatalogFilters = {
  productId?: string | null;
  mainCategoryId?: string | null;
  subcategoryId?: string | null;
  companyId?: string | null;
  search?: string | null;
  barcode?: string | null;
  limit?: number;
};

const catalogRpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function getCurrentDeliveryBranchId(): Promise<string | null> {
  const runtime = await loadBranchRuntimeContext();
  return runtime?.delivery_branch_id || null;
}

export async function getBranchCatalog(filters: CatalogFilters = {}): Promise<Product[]> {
  const runtime = await loadBranchRuntimeContext();
  if (!runtime?.delivery_branch_id) throw new Error('DELIVERY_ADDRESS_REQUIRED');

  const point = await loadSelectedDeliveryPoint();
  if (!point) throw new Error('DELIVERY_ADDRESS_REQUIRED');
  const { data, error } = await catalogRpc('get_customer_discovery_catalog_v1', {
    p_branch_id: runtime.delivery_branch_id,
    p_latitude: point.latitude,
    p_longitude: point.longitude,
    p_product_id: filters.productId || null,
    p_main_category_id: filters.mainCategoryId || null,
    p_subcategory_id: filters.subcategoryId || null,
    p_company_id: filters.companyId || null,
    p_search: filters.search?.trim() || null,
    p_barcode: filters.barcode?.trim() || null,
    p_limit: filters.limit || 1000,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as Product[];
}

export async function getCategories() {
  const { data, error } = await supabase.from('main_categories').select('*').order('position').order('name');
  if (error) console.error('Error fetching categories:', error);
  return data as MainCategory[] || [];
}

export async function getSubcategories(categoryId?: string) {
  let query = supabase.from('subcategories').select('*').order('position').order('name');
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  if (error) console.error('Error fetching subcategories:', error);
  return data || [];
}

export async function getProducts(categoryIdOrSubcategoryId?: string, isSubcategory: boolean = false) {
  return getBranchCatalog(isSubcategory
    ? { subcategoryId: categoryIdOrSubcategoryId || null }
    : { mainCategoryId: categoryIdOrSubcategoryId || null });
}

export async function getProductById(id: string) {
  const rows = await getBranchCatalog({ productId: id, limit: 1 });
  if (rows[0]) return rows[0];

  const { findMarketplaceProductForCurrentAddress } = await import('@/lib/marketplace');
  return findMarketplaceProductForCurrentAddress(id);
}

export async function getProductsByCompany(companyId: string) {
  return getBranchCatalog({ companyId });
}

export async function getCompanyById(id: string) {
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
  if (error) console.error(`Error fetching company with id ${id}:`, error);
  return data;
}

export async function getRelatedProducts(product: Product): Promise<Product[]> {
  const { fetchSmartRecommendations } = await import('@/lib/productRecommendations');
  return fetchSmartRecommendations(product);
}

export async function searchProducts(query: string) {
  return getBranchCatalog({ search: query, limit: 200 });
}

export async function searchProductByBarcode(barcode: string) {
  const normalized = barcode.trim();
  const rows = await getBranchCatalog({ barcode: normalized, limit: 1 });
  if (rows[0]) return rows[0];

  const { getNearbyMarketplaceStores, getMarketplaceStoreCatalog } = await import('@/lib/marketplace');
  const stores = await getNearbyMarketplaceStores(50);
  for (const store of stores) {
    const products = await getMarketplaceStoreCatalog(store.branch_id, normalized, 20);
    const exact = products.find(product =>
      product.barcode === normalized || product.bulk_barcode === normalized
    );
    if (exact) return exact;
  }
  return null;
}

export async function submitOrder(order: Omit<Order, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('online_orders').insert([order] as never[]);
  if (error) console.error(`Error submitting order:`, error);
  return data;
}

export async function getStoreInfo() {
  const { data, error } = await supabase.from('store_settings').select('*').single();
  if (error) console.error(`Error fetching store info:`, error);
  return data;
}

export async function getAddresses(userId: string) {
  const { data, error } = await supabase
    .from('customer_addresses')
    .select(`*, governorates(name), cities(name), areas(name), neighborhoods(name)`)
    .eq('user_id', userId);
  if (error) console.error(`Error fetching addresses:`, error);
  return data || [];
}

export async function createOrUpdateCustomer(customerData: {
  user_id?: string;
  first_name: string;
  last_name: string;
  name?: string;
  phone: string;
  email?: string;
  address?: string;
}) {
  const dataWithName = {
    ...customerData,
    name: customerData.name || `${customerData.first_name} ${customerData.last_name}`.trim(),
  };
  const { data, error } = await supabase.from('customers').upsert(dataWithName, { onConflict: 'user_id' });
  if (error) console.error(`Error creating/updating customer:`, error);
  return data;
}

export async function getUserReturnRequests(userId: string) {
  const { data, error } = await supabase.from('return_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) console.error('Error fetching return requests:', error);
  return data as ReturnRequest[] || [];
}

export async function getReturnRequestItems(returnRequestId: string) {
  const { data, error } = await supabase.from('return_request_items').select(`*, products(*)`).eq('return_request_id', returnRequestId);
  if (error) console.error('Error fetching return request items:', error);
  return data as ReturnRequestItem[] || [];
}

export async function createReturnRequest(
  userId: string,
  orderId: string,
  reason: string,
  items: { productId: string; quantity: number; reason?: string }[],
  images: string[]
) {
  const { data: returnRequest, error: returnRequestError } = await supabase
    .from('return_requests')
    .insert({ user_id: userId, order_id: orderId, reason, images })
    .select()
    .single();
  if (returnRequestError) throw returnRequestError;

  const returnItems = items.map(item => ({
    return_request_id: returnRequest.id,
    product_id: item.productId,
    quantity: item.quantity,
    reason: item.reason,
  }));
  const { error: itemsError } = await supabase.from('return_request_items').insert(returnItems);
  if (itemsError) throw itemsError;
  return returnRequest;
}

export async function uploadReturnImages(files: File[]) {
  const uploadedUrls: string[] = [];
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `returns/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('returns').upload(filePath, file);
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      continue;
    }
    const { data: { publicUrl } } = supabase.storage.from('returns').getPublicUrl(filePath);
    uploadedUrls.push(publicUrl);
  }
  return uploadedUrls;
}
