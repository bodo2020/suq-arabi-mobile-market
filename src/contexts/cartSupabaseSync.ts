import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from './cartTypes';
import { useUser } from './UserContext';
import { customerRpc } from '@/lib/customerPersistence';
import { getCurrentDeliveryBranchId } from '@/lib/supabase';
import { getProductsByIds } from '@/lib/branchProductIds';

const key = (item: CartItem) => `${item.product.id}:${!!item.is_bulk}:${item.unit_of_measure || ''}`;
const offlineCartKey = (userId: string) => `offline_cart:${userId}`;
const pendingCartKey = (userId: string) => `pending_cart:${userId}`;

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

function writeCart(storageKey: string, items: CartItem[]) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

async function reconcileWithBranch(items: CartItem[]): Promise<CartItem[]> {
  if (!items.length || !navigator.onLine) return items;
  const branchId = await getCurrentDeliveryBranchId();
  if (!branchId) return items;

  const products = await getProductsByIds(items.map(item => item.product.id));
  const byId = new Map(products.map(product => [product.id, product]));

  return items.flatMap(item => {
    const product = byId.get(item.product.id);
    if (!product) return [];
    if (item.is_bulk && !product.bulk_enabled) return [];

    const stock = Math.max(0, Number(product.quantity || 0));
    const maxQuantity = item.unit_of_measure === 'weight'
      ? Math.floor(stock * 1000)
      : item.is_bulk
        ? Math.floor(stock / Math.max(1, Number(product.bulk_quantity || 1)))
        : Math.floor(stock);

    if (maxQuantity <= 0) return [];
    const quantity = Math.min(item.quantity, maxQuantity);
    if (quantity <= 0) return [];

    return [{ ...item, product, quantity }];
  });
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
        const guest = await reconcileWithBranch(guestRaw);
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

        // Android can start with no network. In that case use the last local cart
        // immediately and postpone all server reconciliation until connectivity returns.
        if (!navigator.onLine) {
          const hasPending = localStorage.getItem(pendingKey) !== null;
          const hasShadow = localStorage.getItem(shadowKey) !== null;
          const local = hasPending ? readCart(pendingKey) : hasShadow ? readCart(shadowKey) : guest;
          owner.current = userId;
          customer.current = null;
          saved.current = JSON.stringify(local);
          setItems(local);
          setIsInitialized(true);
          setSyncError('أنت بدون إنترنت. تعديلات السلة محفوظة على الجهاز وهتتزامن تلقائيًا لما الشبكة ترجع.');
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
          writeCart(shadowKey, guest);
          return;
        }

        const { data: rows, error } = await supabase.from('cart_items').select('*').eq('customer_id', profile.id);
        if (error) throw error;

        let loaded: CartItem[] = [];
        if (rows.length) {
          const products = await getProductsByIds([...new Set(rows.map(row => row.product_id))]);
          const byId = new Map(products.map(product => [product.id, product]));
          loaded = rows.flatMap(row => {
            const product = byId.get(row.product_id);
            if (!product) return [];
            const metadata = row.metadata as { is_bulk?: boolean; unit_of_measure?: string } | null;
            if (metadata?.is_bulk && !product.bulk_enabled) return [];
            return [{ product, quantity: row.quantity, is_bulk: !!metadata?.is_bulk, unit_of_measure: metadata?.unit_of_measure || undefined } as CartItem];
          });
          loaded = await reconcileWithBranch(loaded);
        }
        if (!current()) return;

        const hasPending = localStorage.getItem(pendingKey) !== null;
        const pending = hasPending ? await reconcileWithBranch(readCart(pendingKey)) : null;
        const merged = pending || mergeCartItems(loaded, guest);
        const next = await reconcileWithBranch(merged);
        if (!current()) return;

        customer.current = profile.id;
        owner.current = userId;
        saved.current = JSON.stringify(loaded);
        writeCart(shadowKey, next);
        if (guest.length || hasPending) {
          writeCart(pendingKey, next);
          saved.current = '';
        }
        setItems(next);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading branch-aware cart:', error);
        if (current()) {
          // Network can disappear between navigator.onLine and a request. Fall back
          // to the local cart instead of showing an empty basket.
          if (!navigator.onLine && userId) {
            const pendingKey = pendingCartKey(userId);
            const shadowKey = offlineCartKey(userId);
            const hasPending = localStorage.getItem(pendingKey) !== null;
            const hasShadow = localStorage.getItem(shadowKey) !== null;
            const local = hasPending ? readCart(pendingKey) : hasShadow ? readCart(shadowKey) : readCart('guest_cart');
            owner.current = userId;
            customer.current = null;
            saved.current = JSON.stringify(local);
            setItems(local);
            setIsInitialized(true);
            setSyncError('الاتصال انقطع. سلتك محفوظة على الجهاز وهتتزامن لما الشبكة ترجع.');
          } else {
            setSyncError('تعذر تحميل السلة المحفوظة حسب فرع عنوانك. أعد المحاولة قبل تعديلها.');
          }
        }
      }
    }

    void load();
    return () => { generation.current++; };
  }, [user?.id, authLoading, reload, setItems, setIsInitialized]);

  useEffect(() => {
    if (!isInitialized || owner.current === undefined || owner.current !== (user?.id || null)) return;
    const serialized = JSON.stringify(items);

    if (owner.current === null) {
      try { localStorage.setItem('guest_cart', serialized); }
      catch { setSyncError('تعذر حفظ السلة على الجهاز.'); }
      return;
    }

    const userId = owner.current;
    const pendingKey = pendingCartKey(userId);
    const shadowKey = offlineCartKey(userId);

    // Always keep a local shadow copy. This is what makes the cart available on
    // a cold Android start with no internet.
    try { localStorage.setItem(shadowKey, serialized); }
    catch { setSyncError('تعذر حفظ نسخة السلة على الجهاز.'); }

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
    try { localStorage.setItem(pendingKey, serialized); } catch { /* Still attempt server persistence. */ }

    const timeout = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (generation.current !== run || owner.current !== userId) return;
        if (!navigator.onLine) return;
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || session?.user.id !== userId || generation.current !== run) return;
        setIsSaving(true);
        try {
          const { error } = await customerRpc('replace_customer_cart', {
            p_expected_user_id: userId,
            p_items: items.map(item => ({
              product_id: item.product.id,
              quantity: item.quantity,
              metadata: { is_bulk: !!item.is_bulk, unit_of_measure: item.unit_of_measure || null },
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
