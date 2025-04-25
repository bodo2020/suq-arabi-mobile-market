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

// Updated Address type to match the customer_addresses table structure
// and include display name properties
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
  // Additional properties for UI display (not in the DB schema)
  governorate_name?: string;
  city_name?: string;
  area_name?: string;
  neighborhood_name?: string;
};

export type Order = {
  id: string;
  user_id?: string;
  status: 'waiting' | 'ready' | 'shipped' | 'done';
  total: number;
  shipping_address?: string;
  shipping_cost?: number;
  payment_method?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  items: any;
  created_at: string;
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

export async function submitOrder(order: Omit<Order, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('online_orders')
    .insert(order);
  
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
  
  // Map the joined data to include the name fields
  const enhancedAddresses = data?.map(addr => ({
    ...addr,
    governorate_name: addr.governorates?.name,
    city_name: addr.cities?.name,
    area_name: addr.areas?.name,
    neighborhood_name: addr.neighborhoods?.name
  })) || [];
  
  return enhancedAddresses;
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
