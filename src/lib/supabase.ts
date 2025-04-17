
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client - these will need to be replaced with actual values
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types based on expected Supabase schema
export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  sale_price?: number;
  image: string;
  category_id: number;
  company_id: number;
  in_stock: boolean;
  created_at: string;
};

export type Category = {
  id: number;
  name: string;
  image: string;
};

export type Company = {
  id: number;
  name: string;
  logo: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type Address = {
  id: number;
  user_id: string;
  address: string;
  is_default: boolean;
};

export type Order = {
  id: number;
  user_id: string;
  status: string;
  total: number;
  address: string;
  phone: string;
  created_at: string;
};

// Fetching functions
export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) console.error('Error fetching categories:', error);
  return data || [];
}

export async function getProducts(categoryId?: number) {
  let query = supabase.from('products').select('*');
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  if (error) console.error('Error fetching products:', error);
  return data || [];
}

export async function getProductById(id: number) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) console.error(`Error fetching product with id ${id}:`, error);
  return data;
}

export async function getProductsByCompany(companyId: number) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId);
  
  if (error) console.error(`Error fetching products for company ${companyId}:`, error);
  return data || [];
}

export async function getCompanyById(id: number) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) console.error(`Error fetching company with id ${id}:`, error);
  return data;
}

export async function getRelatedProducts(productId: number, categoryId: number) {
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
    .from('store_info')
    .select('*')
    .single();
  
  if (error) console.error(`Error fetching store info:`, error);
  return data;
}
