import { supabase } from '@/lib/supabase';

export type PublicTenantRuntime = {
  tenant_id: string;
  tenant_name: string;
  subdomain: string;
  app_access_enabled: boolean;
  online_sales_enabled: boolean;
  customer_app_enabled: boolean;
  block_reason_code?: string | null;
  block_message_ar?: string | null;
  revision: number;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message?: string } | null }>;

export const CUSTOMER_TENANT_SUBDOMAIN =
  String(import.meta.env.VITE_TENANT_SUBDOMAIN || 'elmadawy').trim().toLowerCase();

export async function fetchPublicTenantRuntime(): Promise<PublicTenantRuntime> {
  const { data, error } = await rpc('get_tenant_public_runtime_v1', {
    p_subdomain: CUSTOMER_TENANT_SUBDOMAIN,
  });
  if (error) throw new Error(error.message || 'TENANT_RUNTIME_UNAVAILABLE');
  return data as PublicTenantRuntime;
}
