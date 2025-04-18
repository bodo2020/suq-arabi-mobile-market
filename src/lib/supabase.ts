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
  category_id: string;
  company_id: string;
  quantity: number;
  created_at: string;
  is_offer: boolean;
  bulk_enabled: boolean;
  bulk_quantity?: number;
  bulk_price?: number;
};

export type Category = {
  id: string;
  name: string;
  image_url: string;
  description?: string;
  level: string;
  parent_id?: string;
};

export type Subcategory = {
  id: string;
  name: string;
  image_url: string;
  description?: string;
  category_id: string;
};

export type Subsubcategory = {
  id: string;
  name: string;
  image_url: string;
  description?: string;
  subcategory_id: string;
};

export type Company = {
  id: string;
  name: string;
  logo_url: string;
  description?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type Address = {
  id: string;
  user_id: string;
  address: string;
  is_default: boolean;
};

export type Order = {
  id: string;
  user_id?: string;
  status: string;
  total: number;
  shipping_address?: string;
  shipping_cost?: number;
  payment_method?: string;
  payment_status?: string;
  notes?: string;
  items: any;
  created_at: string;
};

// Fetching functions
export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) console.error('Error fetching categories:', error);
  return data || [];
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

export async function getSubsubcategories(subcategoryId?: string) {
  let query = supabase.from('subsubcategories').select('*');
  
  if (subcategoryId) {
    query = query.eq('subcategory_id', subcategoryId);
  }
  
  const { data, error } = await query;
  if (error) console.error('Error fetching subsubcategories:', error);
  return data || [];
}

export async function getProducts(categoryId?: string) {
  let query = supabase.from('products').select('*');
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
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
    .eq('category_id', categoryId)
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
