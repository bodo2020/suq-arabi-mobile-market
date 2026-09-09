import { supabase } from '@/lib/supabase';

export type CustomerNotificationFilterV2 = 'all' | 'unread';

export type CustomerNotificationItemV2 = {
  id: string;
  event_key: string;
  category: string;
  severity: 'critical' | 'high' | 'normal' | 'info';
  title: string;
  body: string;
  source_kind: string;
  source_id: string | null;
  action_url: string | null;
  action_label: string | null;
  eligible_channels: string[];
  read_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

export type CustomerNotificationCenterV2 = {
  summary: {
    total: number;
    unread: number;
    today: number;
  };
  items: CustomerNotificationItemV2[];
};

export type CustomerNotificationPreferencesV2 = {
  push_enabled: boolean;
  marketing_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
};

function itemFrom(raw: any): CustomerNotificationItemV2 {
  return {
    id: String(raw?.id || ''),
    event_key: String(raw?.event_key || ''),
    category: String(raw?.category || 'customers'),
    severity: ['critical', 'high', 'normal', 'info'].includes(raw?.severity) ? raw.severity : 'normal',
    title: String(raw?.title || 'إشعار جديد'),
    body: String(raw?.body || ''),
    source_kind: String(raw?.source_kind || ''),
    source_id: typeof raw?.source_id === 'string' ? raw.source_id : null,
    action_url: typeof raw?.action_url === 'string' ? raw.action_url : null,
    action_label: typeof raw?.action_label === 'string' ? raw.action_label : null,
    eligible_channels: Array.isArray(raw?.eligible_channels) ? raw.eligible_channels : ['in_app'],
    read_at: typeof raw?.read_at === 'string' ? raw.read_at : null,
    created_at: String(raw?.created_at || ''),
    updated_at: String(raw?.updated_at || raw?.created_at || ''),
    metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
  };
}

export async function fetchCustomerNotificationCenterV2(filter: CustomerNotificationFilterV2 = 'all'): Promise<CustomerNotificationCenterV2> {
  const sync = await (supabase as any).rpc('sync_my_notification_center_v2', { p_branch_id: null });
  if (sync.error) throw sync.error;

  const { data, error } = await (supabase as any).rpc('get_my_notification_center_v2', {
    p_branch_id: null,
    p_filter: filter,
    p_category: null,
    p_limit: 150,
  });
  if (error) throw error;
  const raw: any = data || {};
  return {
    summary: {
      total: Number(raw?.summary?.total || 0),
      unread: Number(raw?.summary?.unread || 0),
      today: Number(raw?.summary?.today || 0),
    },
    items: Array.isArray(raw.items) ? raw.items.map(itemFrom) : [],
  };
}

export async function markCustomerNotificationReadV2(notificationId: string) {
  const { data, error } = await (supabase as any).rpc('mark_notification_read_v2', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function markAllCustomerNotificationsReadV2() {
  const { data, error } = await (supabase as any).rpc('mark_all_notifications_read_v2', {
    p_branch_id: null,
  });
  if (error) throw error;
  return Number(data || 0);
}

export async function getCustomerNotificationPreferencesV2(): Promise<CustomerNotificationPreferencesV2> {
  const { data, error } = await (supabase as any).rpc('get_my_notification_preferences_v2');
  if (error) throw error;
  const raw: any = data || {};
  return {
    push_enabled: raw.push_enabled !== false,
    marketing_enabled: Boolean(raw.marketing_enabled),
    quiet_hours_enabled: raw.quiet_hours_enabled !== false,
    quiet_hours_start: String(raw.quiet_hours_start || '00:00:00'),
    quiet_hours_end: String(raw.quiet_hours_end || '08:00:00'),
    timezone: String(raw.timezone || 'Africa/Cairo'),
  };
}

export async function setCustomerNotificationPreferencesV2(input: Partial<Pick<CustomerNotificationPreferencesV2, 'push_enabled' | 'marketing_enabled' | 'quiet_hours_enabled'>>) {
  const { data, error } = await (supabase as any).rpc('set_my_notification_preferences_v2', {
    p_in_app_enabled: null,
    p_push_enabled: input.push_enabled ?? null,
    p_whatsapp_transactional_enabled: null,
    p_whatsapp_marketing_opt_in: null,
    p_whatsapp_marketing_opt_in_source: null,
    p_email_enabled: null,
    p_marketing_enabled: input.marketing_enabled ?? null,
    p_quiet_hours_enabled: input.quiet_hours_enabled ?? null,
    p_quiet_hours_start: null,
    p_quiet_hours_end: null,
  });
  if (error) throw error;
  return data;
}
