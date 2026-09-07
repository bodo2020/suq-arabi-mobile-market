import { getCurrentDeliveryBranchId, supabase, type Product } from '@/lib/supabase';

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function getProductsByIds(productIds: string[]): Promise<Product[]> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return [];

  const branchId = await getCurrentDeliveryBranchId();
  if (!branchId) throw new Error('DELIVERY_ADDRESS_REQUIRED');

  const { data, error } = await rpc('get_customer_branch_products_by_ids', {
    p_branch_id: branchId,
    p_product_ids: ids,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as Product[];
}
