
import { supabase } from '@/integrations/supabase/client';

// Type definitions
export interface MainCategory {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  product_count?: number;
}

export interface Subcategory {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  category_id: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  offer_price?: number;
  image_urls?: string[];
  main_category_id?: string;
  subcategory_id?: string;
  company_id?: string;
  barcode?: string;
  quantity?: number;
  purchase_price: number;
  is_offer?: boolean;
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Address {
  id: string;
  user_id: string;
  address: string;
  is_default?: boolean;
  governorate_id?: string;
  city_id?: string;
  area_id?: string;
  neighborhood_id?: string;
}

export interface StoreInfo {
  name: string;
  description?: string;
  logo_url?: string;
  primary_color?: string;
  address?: string;
  phone?: string;
  email?: string;
}

// Data fetching functions
export async function getCategories(): Promise<MainCategory[]> {
  const { data, error } = await supabase.from('main_categories').select('*');
  if (error) console.error('Error fetching categories:', error);
  return data || [];
}

export async function getSubcategories(categoryId?: string): Promise<Subcategory[]> {
  let query = supabase.from('subcategories').select('*');
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  if (error) console.error('Error fetching subcategories:', error);
  return data || [];
}

// Only updating the getProducts function to make it work properly with both main categories and subcategories
export async function getProducts(categoryId?: string) {
  let query = supabase.from('products').select('*');
  
  if (categoryId) {
    // Try to match on either main_category_id or subcategory_id
    query = query.or(`main_category_id.eq.${categoryId},subcategory_id.eq.${categoryId}`);
  }
  
  const { data, error } = await query;
  if (error) console.error('Error fetching products:', error);
  return data || [];
}

export async function searchProducts(searchTerm: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', `%${searchTerm}%`);
  
  if (error) console.error('Error searching products:', error);
  return data || [];
}

export async function getProductById(productId: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  
  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }
  
  return data;
}

export async function getRelatedProducts(productId: string, categoryId?: string): Promise<Product[]> {
  if (!categoryId) {
    const product = await getProductById(productId);
    if (!product) return [];
    categoryId = product.main_category_id || '';
  }
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('main_category_id', categoryId)
    .neq('id', productId)
    .limit(6);
  
  if (error) console.error('Error fetching related products:', error);
  return data || [];
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  
  if (error) {
    console.error('Error fetching company:', error);
    return null;
  }
  
  return data;
}

export async function getProductsByCompany(companyId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId);
  
  if (error) console.error('Error fetching products by company:', error);
  return data || [];
}

export async function getStoreInfo(): Promise<StoreInfo | null> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .single();
  
  if (error) {
    console.error('Error fetching store info:', error);
    return null;
  }
  
  return data;
}

export async function submitOrder(orderData: any) {
  const { data, error } = await supabase.from('online_orders').insert(orderData);
  
  if (error) {
    console.error('Error submitting order:', error);
    throw error;
  }
  
  return data;
}

// Export the supabase client
export { supabase };
