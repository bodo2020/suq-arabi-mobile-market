import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from './cartTypes';
import { useUser } from './UserContext';
import { customerRpc } from '@/lib/customerPersistence';

const key = (item: CartItem) => `${item.product.id}:${!!item.is_bulk}:${item.unit_of_measure || ''}`;
export function mergeCartItems(saved: CartItem[], guest: CartItem[]) {
  const merged = new Map(saved.map(item => [key(item), item]));
  for (const item of guest) {
    const existing = merged.get(key(item));
    merged.set(key(item), existing ? { ...existing, quantity: existing.quantity + item.quantity } : item);
  }
  return [...merged.values()];
}
function readCart(storageKey: string): CartItem[] {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(item => !item?.product?.id || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    throw new Error('Invalid saved cart');
  }
  return value;
}

export function useCartSync(items: CartItem[], setItems: React.Dispatch<React.SetStateAction<CartItem[]>>,
  isInitialized: boolean, setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>) {
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
    window.addEventListener('online', retry);
    return () => {
      window.removeEventListener('customer-profile-ready', retry);
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
        const guest = readCart('guest_cart');
        if (!userId) {
          owner.current = null;
          saved.current = JSON.stringify(guest);
          setItems(guest);
          setIsInitialized(true);
          return;
        }
        const { data: profile, error: profileError } = await supabase.from('customers')
          .select('id').eq('user_id', userId).maybeSingle();
        if (profileError) throw profileError;
        if (!current()) return;
        if (!profile) {
          owner.current = userId;
          setItems(guest);
          setIsInitialized(true);
          return; // Onboarding alone creates the customer profile.
        }
        const { data: rows, error } = await supabase.from('cart_items').select('*').eq('customer_id', profile.id);
        if (error) throw error;
        let loaded: CartItem[] = [];
        if (rows.length) {
          const { data: products, error: productError } = await supabase.from('products').select('*')
            .in('id', [...new Set(rows.map(row => row.product_id))]);
          if (productError) throw productError;
          loaded = rows.map(row => {
            const product = products.find(product => product.id === row.product_id);
            if (!product) throw new Error('A saved product could not be loaded');
            const metadata = row.metadata as { is_bulk?: boolean; unit_of_measure?: string } | null;
            return { product, quantity: row.quantity, is_bulk: !!metadata?.is_bulk, unit_of_measure: metadata?.unit_of_measure || undefined };
          });
        }
        if (!current()) return;
        const pendingKey = `pending_cart:${userId}`;
        const hasPending = localStorage.getItem(pendingKey) !== null;
        // Retry an uncertain replacement without adding the guest quantities twice.
        const next = hasPending ? readCart(pendingKey) : mergeCartItems(loaded, guest);
        customer.current = profile.id;
        owner.current = userId;
        saved.current = JSON.stringify(loaded);
        if (guest.length || hasPending) {
          localStorage.setItem(pendingKey, JSON.stringify(next));
          saved.current = '';
        }
        setItems(next);
        setIsInitialized(true);
      } catch {
        if (current()) setSyncError('تعذر تحميل السلة المحفوظة. أعد المحاولة قبل تعديلها.');
        // A failed read must never become an empty write.
      }
    }
    void load();
    return () => { generation.current++; };
  }, [user?.id, authLoading, reload, setItems, setIsInitialized]);

  useEffect(() => {
    if (!isInitialized || owner.current === undefined || owner.current !== (user?.id || null)) return;
    const serialized = JSON.stringify(items);
    if (owner.current === null || !customer.current) {
      try { localStorage.setItem('guest_cart', serialized); } catch { setSyncError('تعذر حفظ السلة على الجهاز.'); }
      return;
    }
    if (!customer.current || serialized === saved.current) return;
    const userId = owner.current;
    const run = generation.current;
    const pendingKey = `pending_cart:${userId}`;
    try { localStorage.setItem(pendingKey, serialized); } catch { /* Still attempt server persistence. */ }
    const timeout = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (generation.current !== run || owner.current !== userId) return;
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || session?.user.id !== userId || generation.current !== run) return;
        setIsSaving(true);
        try {
          const { error } = await customerRpc('replace_customer_cart', {
            p_expected_user_id: userId,
            p_items: items.map(item => ({ product_id: item.product.id, quantity: item.quantity,
              metadata: { is_bulk: !!item.is_bulk, unit_of_measure: item.unit_of_measure || null } }))
          });
          if (error) throw error;
          if (generation.current !== run) return;
          saved.current = serialized;
          localStorage.removeItem('guest_cart');
          if (JSON.stringify(latest.current) === serialized) localStorage.removeItem(pendingKey);
          setSyncError(null);
        } catch {
          if (generation.current === run) setSyncError('تعذر حفظ آخر تعديل. سلتك ما زالت هنا؛ أعد المحاولة.');
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
