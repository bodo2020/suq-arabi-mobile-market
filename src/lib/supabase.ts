import { createClient } from '@supabase/supabase-js';
import { supabase as configuredSupabase } from '@/integrations/supabase/client';

// Use the properly configured supabase client from the integrations folder
export const supabase = configuredSupabase;

// Types based on expected Supabase schema
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
  unit_of_measure?: string;
  barcode_type?: string;
  barcode?: string;
  bulk_barcode?: string;
};

// Updated Category type to match the main_categories table
export type MainCategory = {
  id: string;
  name: string;
  image_url: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

// Legacy Category type - keeping for backward compatibility
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

// Updated Address type to include location coordinates
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
  // Join properties
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

// New types for return requests
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
  // Join properties
  products?: Product;
};

// Fetching functions
export async function getCategories() {
  const { data, error } = await supabase.from('main_categories').select('*');
  if (error) console.error('Error fetching categories:', error);
  return data as MainCategory[] || [];
}

export async function getSubcategories(categoryId?: string) {
  let query = supabase.from('subcategories').select('*');
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  if (error) console.error('Error fetching subcategories:', error);
  return data || [];
}

export async function getProducts(categoryIdOrSubcategoryId?: string, isSubcategory: boolean = false) {
  let query = supabase.from('products').select('*');
  
  if (categoryIdOrSubcategoryId) {
    if (isSubcategory) {
      // Filter by subcategory_id
      query = query.eq('subcategory_id', categoryIdOrSubcategoryId);
    } else {
      // Filter by main_category_id
      query = query.eq('main_category_id', categoryIdOrSubcategoryId);
    }
  }
  
  const { data, error } = await query;
  if (error) console.error('Error fetching products:', error);
  return data || [];
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) console.error(`Error fetching product with id ${id}:`, error);
  return data;
}

export async function getProductsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId);
  
  if (error) console.error(`Error fetching products for company ${companyId}:`, error);
  return data || [];
}

export async function getCompanyById(id: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) console.error(`Error fetching company with id ${id}:`, error);
  return data;
}

export async function getRelatedProducts(productId: string, categoryId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('main_category_id', categoryId)
    .neq('id', productId)
    .limit(4);
  
  if (error) console.error(`Error fetching related products:`, error);
  return data || [];
}

export async function searchProducts(query: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', `%${query}%`);
  
  if (error) console.error(`Error searching products:`, error);
  return data || [];
}

export async function searchProductByBarcode(barcode: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`barcode.eq.${barcode},bulk_barcode.eq.${barcode}`);
  
  if (error) console.error(`Error searching product by barcode:`, error);
  return data?.[0] || null;
}

export async function submitOrder(order: Omit<Order, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('online_orders')
    .insert([order]);
  
  if (error) console.error(`Error submitting order:`, error);
  return data;
}

export async function getStoreInfo() {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .single();
  
  if (error) console.error(`Error fetching store info:`, error);
  return data;
}

// Function to get addresses for a user
export async function getAddresses(userId: string) {
  const { data, error } = await supabase
    .from('customer_addresses')
    .select(`
      *,
      governorates(name),
      cities(name),
      areas(name),
      neighborhoods(name)
    `)
    .eq('user_id', userId);
  
  if (error) console.error(`Error fetching addresses:`, error);
  return data || [];
}

// Updated function to create or update a customer
export async function createOrUpdateCustomer(customerData: { 
  user_id?: string;
  first_name: string;
  last_name: string;
  name?: string;
  phone: string;
  email?: string;
  address?: string;
}) {
  // Ensure name is always set, using first and last name if not provided
  const dataWithName = {
    ...customerData,
    name: customerData.name || `${customerData.first_name} ${customerData.last_name}`.trim(),
  };
  
  const { data, error } = await supabase
    .from('customers')
    .upsert(dataWithName, { onConflict: 'user_id' });
  
  if (error) console.error(`Error creating/updating customer:`, error);
  return data;
}

// New function to get return requests for a user
export async function getUserReturnRequests(userId: string) {
  const { data, error } = await supabase
    .from('return_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) console.error('Error fetching return requests:', error);
  return data as ReturnRequest[] || [];
}

// Function to get return request items for a specific return request
export async function getReturnRequestItems(returnRequestId: string) {
  const { data, error } = await supabase
    .from('return_request_items')
    .select(`
      *,
      products(*)
    `)
    .eq('return_request_id', returnRequestId);
  
  if (error) console.error('Error fetching return request items:', error);
  return data as ReturnRequestItem[] || [];
}

// Function to create a return request
export async function createReturnRequest(
  userId: string,
  orderId: string,
  reason: string,
  items: { productId: string; quantity: number; reason?: string }[],
  images: string[]
) {
  // First create the return request
  const { data: returnRequest, error: returnRequestError } = await supabase
    .from('return_requests')
    .insert({
      user_id: userId,
      order_id: orderId,
      reason,
      images
    })
    .select()
    .single();
  
  if (returnRequestError) {
    console.error('Error creating return request:', returnRequestError);
    throw returnRequestError;
  }
  
  // Then create the return request items
  const returnItems = items.map(item => ({
    return_request_id: returnRequest.id,
    product_id: item.productId,
    quantity: item.quantity,
    reason: item.reason
  }));
  
  const { error: itemsError } = await supabase
    .from('return_request_items')
    .insert(returnItems);
  
  if (itemsError) {
    console.error('Error creating return request items:', itemsError);
    throw itemsError;
  }
  
  return returnRequest;
}

// Function to upload images for a return request
export async function uploadReturnImages(files: File[]) {
  const uploadedUrls: string[] = [];
  
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `returns/${fileName}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from('returns')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      continue;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('returns')
      .getPublicUrl(filePath);
    
    uploadedUrls.push(publicUrl);
  }
  
  return uploadedUrls;
}

