import { supabase } from '@/lib/supabase';

export type CustomerReceivableAccount = {
  branch_id: string;
  branch_name: string;
  balance: number;
  credit_enabled: boolean;
  credit_limit: number;
  credit_available: number;
  updated_at: string;
};

export type CustomerReceivableLedgerEntry = {
  id: string;
  branch_id: string;
  branch_name: string;
  entry_type: 'charge' | 'payment' | 'adjustment_increase' | 'adjustment_decrease' | 'writeoff' | string;
  signed_amount: number;
  description: string | null;
  reference_kind: string | null;
  reference_id: string | null;
  created_at: string;
  balance_after: number;
  invoice_number?: string | null;
  invoice_total?: number | null;
  credit_amount?: number | null;
  paid_on_sale?: number | null;
  payment_breakdown?: Array<{
    code?: string;
    name?: string;
    method_type?: string;
    base_amount?: number;
    charged_amount?: number;
    fee_amount?: number;
    reference?: string | null;
  }> | null;
};

export type CustomerReceivablesWorkspace = {
  customer_id: string | null;
  total_balance: number;
  total_credit_limit: number;
  total_credit_available: number;
  accounts: CustomerReceivableAccount[];
  ledger: CustomerReceivableLedgerEntry[];
  generated_at?: string;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message?: string } | null }>;

function normalize(raw: CustomerReceivablesWorkspace): CustomerReceivablesWorkspace {
  return {
    customer_id: raw?.customer_id || null,
    total_balance: Number(raw?.total_balance || 0),
    total_credit_limit: Number(raw?.total_credit_limit || 0),
    total_credit_available: Number(raw?.total_credit_available || 0),
    accounts: Array.isArray(raw?.accounts) ? raw.accounts.map(row => ({
      ...row,
      balance: Number(row.balance || 0),
      credit_enabled: Boolean(row.credit_enabled),
      credit_limit: Number(row.credit_limit || 0),
      credit_available: Number(row.credit_available || 0),
    })) : [],
    ledger: Array.isArray(raw?.ledger) ? raw.ledger.map(row => ({
      ...row,
      signed_amount: Number(row.signed_amount || 0),
      balance_after: Number(row.balance_after || 0),
      invoice_total: row.invoice_total == null ? null : Number(row.invoice_total),
      credit_amount: row.credit_amount == null ? null : Number(row.credit_amount),
      paid_on_sale: row.paid_on_sale == null ? null : Number(row.paid_on_sale),
      payment_breakdown: Array.isArray(row.payment_breakdown) ? row.payment_breakdown.map(part => ({
        ...part,
        base_amount: Number(part.base_amount || 0),
        charged_amount: Number(part.charged_amount || 0),
        fee_amount: Number(part.fee_amount || 0),
      })) : null,
    })) : [],
    generated_at: raw?.generated_at,
  };
}

export async function getMyCustomerReceivables(limit = 150): Promise<CustomerReceivablesWorkspace> {
  const { data, error } = await rpc('get_my_customer_receivables_v2', { p_limit: Math.max(1, Math.min(limit, 300)) });
  if (error) {
    if (error.message?.includes('AUTH_REQUIRED')) throw new Error('سجّل الدخول لعرض مديونيتك.');
    throw new Error(error.message || 'تعذر تحميل المديونية حاليًا.');
  }
  return normalize((data || {}) as CustomerReceivablesWorkspace);
}
