
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
