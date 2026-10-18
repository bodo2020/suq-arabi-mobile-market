import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem, cartItemIdentity } from './cartTypes';
import { useUser } from './UserContext';
import { customerRpc } from '@/lib/customerPersistence';
import { getCurrentDeliveryBranchId } from '@/lib/supabase';
import { getProductsByIds } from '@/lib/branchProductIds';
import { getMarketplaceStoreCatalog } from '@/lib/marketplace';

const offlineCartKey = (userId: string) => `offline_cart:${userId}`;
const pendingCartKey = (userId: string) => `pending_cart:${userId}`;

function keepAllowedSources(items: CartItem[]) {
  return items.filter(item => item.commerce_source !== 'marketplace' || Boolean(
    item.marketplace_branch_id && item.merchant_id && item.marketplace_listing_id,
  ));
}

export function mergeCartItems(saved: CartItem[], guest: CartItem[]) {
  const merged = new Map(saved.map(item => [cartItemIdentity(item), item]));
  for (const item of guest) {
    const existing = merged.get(cartItemIdentity(item));
    merged.set(cartItemIdentity(item), existing ? { ...existing, quantity: existing.quantity + item.quantity } : item);
  }
  return keepAllowedSources([...merged.values()]);
}

function readCart(storageKey: string): CartItem[] {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(item => !item?.product?.id || !Number.isInteger(item.quantity) || item.quantity <= 0)) throw new Error('Invalid saved cart');
  return keepAllowedSources(value);
}
function writeCart(storageKey: string, items: CartItem[]) { localStorage.setItem(storageKey, JSON.stringify(items)); }

async function reconcileWithCommerce(items: CartItem[]): Promise<CartItem[]> {
  if (!items.length || !navigator.onLine) return keepAllowedSources(items);

  const candidate = keepAllowedSources(items);
  const result: CartItem[] = [];

  const ownedItems = candidate.filter(item => item.commerce_source !== 'marketplace');
  if (ownedItems.length) {
    const branchId = await getCurrentDeliveryBranchId();
    if (branchId) {
      const products = await getProductsByIds([...new Set(ownedItems.map(item => item.product.id))]);
      const byId = new Map(products.map(product => [product.id, product]));
      for (const item of ownedItems) {
        const product = byId.get(item.product.id);
        if (!product) continue;
        if (item.is_bulk && !product.bulk_enabled) continue;
        const stock = Math.max(0, Number(product.quantity || 0));
        const maxQuantity = item.unit_of_measure === 'weight'
          ? Math.floor(stock * 1000)
          : item.is_bulk
            ? Math.floor(stock / Math.max(1, Number(product.bulk_quantity || 1)))
            : Math.floor(stock);
        if (maxQuantity <= 0) continue;
        result.push({ ...item, product, quantity: Math.min(item.quantity, maxQuantity), commerce_source: 'owned' });
      }
    }
  }

  const marketplaceItems = candidate.filter(item => item.commerce_source === 'marketplace');
  const branchIds = [...new Set(marketplaceItems.map(item => item.marketplace_branch_id).filter((value): value is string => Boolean(value)))];
  for (const branchId of branchIds) {
    const catalog = await getMarketplaceStoreCatalog(branchId, null, 500);
    const byListing = new Map(catalog.map(product => [product.marketplace_listing_id, product]));
    for (const item of marketplaceItems.filter(value => value.marketplace_branch_id === branchId)) {
      const product = item.marketplace_listing_id ? byListing.get(item.marketplace_listing_id) : null;
      if (!product) continue;
      const stock = Math.max(0, Number(product.quantity || 0));
      const isWeight = item.unit_of_measure === 'weight';
      const maxQuantity = isWeight ? Math.floor(stock * 1000) : Math.floor(stock);
      if (maxQuantity <= 0) continue;
      result.push({
        ...item,
        product,
        quantity: Math.min(item.quantity, maxQuantity),
        commerce_source: 'marketplace',
        marketplace_listing_id: item.marketplace_listing_id || product.marketplace_listing_id || null,
        merchant_id: item.merchant_id || product.merchant_id || null,
        merchant_name: item.merchant_name || product.merchant_name || null,
        marketplace_branch_id: branchId,
        marketplace_branch_name: item.marketplace_branch_name || product.marketplace_branch_name || null,
      });
    }
  }

  return keepAllowedSources(result);
}

type SavedMetadata = {
  is_bulk?: boolean;
  unit_of_measure?: string;
  source_kind?: 'owned' | 'marketplace';
  merchant_id?: string | null;
  merchant_name?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  listing_id?: string | null;
};

async function hydrateRows(rows: Array<{ product_id: string; quantity: number; metadata: unknown }>): Promise<CartItem[]> {
  const ownedRows = rows.filter(row => ((row.metadata as SavedMetadata | null)?.source_kind || 'owned') !== 'marketplace');
  const marketRows = rows.filter(row => (row.metadata as SavedMetadata | null)?.source_kind === 'marketplace');
  const result: CartItem[] = [];

  if (ownedRows.length) {
    const products = await getProductsByIds([...new Set(ownedRows.map(row => row.product_id))]);
    const byId = new Map(products.map(product => [product.id, product]));
    for (const row of ownedRows) {
      const product = byId.get(row.product_id);
      if (!product) continue;
      const metadata = row.metadata as SavedMetadata | null;
      if (metadata?.is_bulk && !product.bulk_enabled) continue;
      result.push({
        product,
        quantity: row.quantity,
        is_bulk: !!metadata?.is_bulk,
        unit_of_measure: metadata?.unit_of_measure || undefined,
        commerce_source: 'owned',
      });
    }
  }

  const branchIds = [...new Set(
    marketRows
      .map(row => (row.metadata as SavedMetadata | null)?.branch_id)
      .filter((value): value is string => Boolean(value)),
  )];

  for (const branchId of branchIds) {
    const catalog = await getMarketplaceStoreCatalog(branchId, null, 500);
    const byListing = new Map(catalog.map(product => [product.marketplace_listing_id, product]));
    for (const row of marketRows) {
      const meta = row.metadata as SavedMetadata;
      if (meta.branch_id !== branchId) continue;
      const product = meta.listing_id ? byListing.get(meta.listing_id) : null;
      if (!product) continue;
      result.push({
        product,
        quantity: row.quantity,
        is_bulk: false,
        unit_of_measure: meta.unit_of_measure || undefined,
        commerce_source: 'marketplace',
        marketplace_listing_id: meta.listing_id || null,
        merchant_id: meta.merchant_id || product.merchant_id,
        merchant_name: meta.merchant_name || product.merchant_name,
        marketplace_branch_id: branchId,
        marketplace_branch_name: meta.branch_name || product.marketplace_branch_name,
      });
    }
  }

  return keepAllowedSources(result);
}

export function useCartSync(
  items: CartItem[],
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>,
  isInitialized: boolean,
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const { user, authLoading } = useUser();
  const [reload, setReload] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const owner = useRef<string | null | undefined>(undefined);
  const customer = useRef<string | null>(null);
  const generation = useRef(0);
  const saved = useRef('');
  const queue = useRef(Promise.resolve());
  const latest = useRef(items);
  latest.current = items;

  useEffect(() => {
    const retry = () => setReload(value => value + 1);
    window.addEventListener('customer-profile-ready', retry);
    window.addEventListener('delivery-address-changed', retry);
    window.addEventListener('guest-address-changed', retry);
    window.addEventListener('online', retry);
    return () => {
      window.removeEventListener('customer-profile-ready', retry);
      window.removeEventListener('delivery-address-changed', retry);
      window.removeEventListener('guest-address-changed', retry);
      window.removeEventListener('online', retry);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const run = ++generation.current;
    const userId = user?.id || null;
    owner.current = undefined;
    customer.current = null;
    setIsInitialized(false);
    setIsSaving(false);
    setSyncError(null);
    setItems([]);
    const current = () => generation.current === run;

    async function load() {
      try {
        await queue.current;
        if (!current()) return;
        const guestRaw = readCart('guest_cart');
        const guest = await reconcileWithCommerce(guestRaw);
        if (!current()) return;

        if (!userId) {
          owner.current = null;
          saved.current = JSON.stringify(guest);
          setItems(guest);
          setIsInitialized(true);
          if (JSON.stringify(guestRaw) !== JSON.stringify(guest)) writeCart('guest_cart', guest);
          return;
        }

        const pendingKey = pendingCartKey(userId);
        const shadowKey = offlineCartKey(userId);
        if (!navigator.onLine) {
          const hasPending = localStorage.getItem(pendingKey) !== null;
          const hasShadow = localStorage.getItem(shadowKey) !== null;
          const local = hasPending ? readCart(pendingKey) : hasShadow ? readCart(shadowKey) : guest;
          owner.current = userId;
          saved.current = JSON.stringify(local);
          setItems(local);
          setIsInitialized(true);
          setSyncError('أنت بدون إنترنت. تعديلات السلة محفوظة على الجهاز وهتتزامن تلقائيًا لما الشبكة ترجع.');
          return;
        }

        const { data: profile, error: profileError } = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle();
        if (profileError) throw profileError;
        if (!current()) return;
        if (!profile) {
          owner.current = userId;
          setItems(guest);
          setIsInitialized(true);
          writeCart(shadowKey, guest);
          return;
        }

        const { data: rows, error } = await supabase.from('cart_items').select('product_id,quantity,metadata').eq('customer_id', profile.id);
        if (error) throw error;
        const loaded = rows.length ? await hydrateRows(rows) : [];
        if (!current()) return;
        const hasPending = localStorage.getItem(pendingKey) !== null;
        const pending = hasPending ? await reconcileWithCommerce(readCart(pendingKey)) : null;
        const merged = pending || mergeCartItems(loaded, guest);
        const next = await reconcileWithCommerce(merged);
        if (!current()) return;

        customer.current = profile.id;
        owner.current = userId;
        saved.current = JSON.stringify(loaded);
        writeCart(shadowKey, next);
        if (guest.length || hasPending) { writeCart(pendingKey, next); saved.current = ''; }
        setItems(next);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading commerce-aware cart:', error);
        if (!current()) return;
        if (!navigator.onLine && userId) {
          const pendingKey = pendingCartKey(userId);
          const shadowKey = offlineCartKey(userId);
          const hasPending = localStorage.getItem(pendingKey) !== null;
          const hasShadow = localStorage.getItem(shadowKey) !== null;
          const local = hasPending ? readCart(pendingKey) : hasShadow ? readCart(shadowKey) : readCart('guest_cart');
          owner.current = userId;
          saved.current = JSON.stringify(local);
          setItems(local);
          setIsInitialized(true);
          setSyncError('الاتصال انقطع. سلتك محفوظة على الجهاز وهتتزامن لما الشبكة ترجع.');
        } else setSyncError('تعذر تحميل السلة المحفوظة. أعد المحاولة قبل تعديلها.');
      }
    }
    void load();
    return () => { generation.current++; };
  }, [user?.id, authLoading, reload, setItems, setIsInitialized]);

  useEffect(() => {
    if (!isInitialized || owner.current === undefined || owner.current !== (user?.id || null)) return;
    const serialized = JSON.stringify(items);
    if (owner.current === null) {
      try { localStorage.setItem('guest_cart', serialized); } catch { setSyncError('تعذر حفظ السلة على الجهاز.'); }
      return;
    }

    const userId = owner.current;
    const pendingKey = pendingCartKey(userId);
    const shadowKey = offlineCartKey(userId);
    try { localStorage.setItem(shadowKey, serialized); } catch { setSyncError('تعذر حفظ نسخة السلة على الجهاز.'); }
    if (!navigator.onLine || !customer.current) {
      try {
        localStorage.setItem(pendingKey, serialized);
        if (!navigator.onLine) setSyncError('أنت بدون إنترنت. آخر تعديل محفوظ على الجهاز وهيتزامن تلقائيًا.');
      } catch {
        setSyncError('تعذر حفظ آخر تعديل على الجهاز.');
      }
      return;
    }
    if (serialized === saved.current) return;
    const run = generation.current;
    try { localStorage.setItem(pendingKey, serialized); } catch { /* continue */ }

    const timeout = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (generation.current !== run || owner.current !== userId || !navigator.onLine) return;
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || session?.user.id !== userId || generation.current !== run) return;
        setIsSaving(true);
        try {
          const { error } = await customerRpc('replace_customer_cart', {
            p_expected_user_id: userId,
            p_items: items.map(item => ({
              product_id: item.product.id,
              quantity: item.quantity,
              metadata: {
                is_bulk: !!item.is_bulk,
                unit_of_measure: item.unit_of_measure || null,
                source_kind: item.commerce_source || 'owned',
                merchant_id: item.merchant_id || null,
                merchant_name: item.merchant_name || null,
                branch_id: item.marketplace_branch_id || null,
                branch_name: item.marketplace_branch_name || null,
                listing_id: item.marketplace_listing_id || null,
              },
            })),
          });
          if (error) throw error;
          if (generation.current !== run) return;
          saved.current = serialized;
          localStorage.removeItem('guest_cart');
          if (JSON.stringify(latest.current) === serialized) localStorage.removeItem(pendingKey);
          writeCart(shadowKey, latest.current);
          setSyncError(null);
        } catch {
          if (generation.current === run) {
            setSyncError(navigator.onLine
              ? 'تعذر حفظ آخر تعديل. سلتك ما زالت هنا؛ أعد المحاولة.'
              : 'الاتصال انقطع. آخر تعديل محفوظ على الجهاز وهيتزامن تلقائيًا.');
          }
        } finally {
          if (generation.current === run) setIsSaving(false);
        }
      }).catch(() => {
        if (generation.current === run) setSyncError('تعذر حفظ السلة. أعد المحاولة.');
      });
    }, 350);
    return () => clearTimeout(timeout);
  }, [items, isInitialized, user?.id]);

  return { syncError, isSaving, retrySync: () => setReload(value => value + 1) };
}
