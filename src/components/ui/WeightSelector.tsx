import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Scale } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from './drawer';
import { Product } from '@/lib/supabase';
import { formatWeightAmount, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';
import { useCart } from '@/contexts/useCart';

const MAX_WEIGHT_GRAMS = 100000;

interface WeightSelectorProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number;
  onSelect?: (grams: number) => void;
}

export default function WeightSelector({ product, isOpen, onClose, initialWeight, onSelect }: WeightSelectorProps) {
  const { items, addToCart, updateQuantity, isInitialized } = useCart();
  const existing = items.find(item => item.product.id === product.id && (item.marketplace_listing_id || null) === (product.marketplace_listing_id || null) && item.unit_of_measure === 'weight' && !item.is_bulk);
  const step = productWeightStepGrams(product);
  const stockGrams = Math.max(0, Math.floor(Number(product.quantity || 0) * 1000));
  const maxAllowed = Math.min(MAX_WEIGHT_GRAMS, stockGrams);
  const initialCandidate = Math.round(Number(initialWeight || existing?.quantity || step));
  const startingWeight = maxAllowed > 0 ? Math.min(maxAllowed, Math.max(1, initialCandidate)) : Math.max(1, initialCandidate);
  const [weight, setWeight] = useState(String(startingWeight));

  useEffect(() => {
    if (!isOpen) return;
    const candidate = Math.round(Number(initialWeight || existing?.quantity || step));
    const next = maxAllowed > 0 ? Math.min(maxAllowed, Math.max(1, candidate)) : Math.max(1, candidate);
    setWeight(String(next));
  }, [isOpen, initialWeight, existing?.quantity, step, maxAllowed]);

  const presets = useMemo(() => {
    return [...new Set([step, step * 2, 500, 1000, step * 4])]
      .filter(value => value > 0 && value <= maxAllowed)
      .sort((a, b) => a - b)
      .slice(0, 5);
  }, [step, maxAllowed]);

  const amount = Number(weight);
  const valid = Number.isInteger(amount) && amount > 0 && maxAllowed > 0 && amount <= maxAllowed;
  const price = productUnitPrice(product);
  const total = valid ? price * amount / 1000 : 0;

  const nudge = (direction: 1 | -1) => {
    const current = Number.isFinite(amount) && amount > 0 ? amount : step;
    const next = Math.min(Math.max(1, maxAllowed || MAX_WEIGHT_GRAMS), Math.max(1, current + direction * step));
    setWeight(String(next));
  };

  const save = () => {
    if (!valid || !isInitialized) return;
    if (onSelect) {
      onSelect(amount);
      onClose();
      return;
    }
    if (existing) updateQuantity(product.id, amount, false, product.marketplace_listing_id || null);
    else addToCart({ ...product, quantity: amount, price: product.price, unit_of_measure: 'weight', is_bulk: false });
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={open => { if (!open) onClose(); }} shouldScaleBackground={false}>
      <DrawerContent className="z-[160] max-h-[88dvh] rounded-t-[30px] border-0 bg-white" dir="rtl">
        <div className="mx-auto w-full max-w-xl overflow-y-auto px-4 pb-[calc(18px+var(--safe-area-bottom))] sm:px-6">
          <DrawerHeader className="px-0 pb-2 pt-5 text-right sm:text-right">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#005931]"><Scale size={21} /></div>
            <DrawerTitle className="text-2xl font-black text-slate-950">اختار الوزن</DrawerTitle>
            <DrawerDescription className="mt-1 text-sm leading-6 text-slate-500">
              {product.name} · {price.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م للكيلو
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-5 py-3">
            {presets.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-400">اختيار سريع</p>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {presets.map(value => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={amount === value}
                      onClick={() => setWeight(String(value))}
                      className={`h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition ${amount === value ? 'border-[#005931] bg-[#005931] text-white' : 'border-emerald-100 bg-emerald-50/60 text-[#005931]'}`}
                    >
                      {formatWeightAmount(value)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[24px] bg-[#f7f8f7] p-3">
              <p className="mb-2 px-1 text-xs font-bold text-slate-400">حدد الوزن بالجرام</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => nudge(-1)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#005931] shadow-sm" aria-label="تقليل الوزن"><Minus size={19} /></button>
                <Input
                  id="cart-weight"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={Math.max(1, maxAllowed)}
                  step={1}
                  value={weight}
                  onChange={event => setWeight(event.target.value)}
                  className="h-12 rounded-2xl border-0 bg-white text-center text-lg font-black shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-200"
                  aria-invalid={!valid}
                />
                <button type="button" onClick={() => nudge(1)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#005931] text-white shadow-sm" aria-label="زيادة الوزن"><Plus size={19} /></button>
              </div>
              <p className={`mt-2 px-1 text-xs ${valid ? 'text-slate-400' : 'font-semibold text-red-600'}`}>
                {valid ? `المتاح حتى ${formatWeightAmount(maxAllowed)}` : maxAllowed <= 0 ? 'المنتج غير متاح بالوزن حاليًا.' : `اكتب وزنًا من 1 جم إلى ${formatWeightAmount(maxAllowed)}.`}
              </p>
            </div>

            <div className="flex items-end justify-between rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4">
              <div><span className="block text-xs font-semibold text-slate-500">الوزن المختار</span><strong className="mt-1 block text-lg font-black text-slate-950">{valid ? formatWeightAmount(amount) : '—'}</strong></div>
              <div className="text-left"><span className="block text-xs font-semibold text-slate-500">الإجمالي</span><strong className="mt-1 block text-2xl font-black text-[#005931]">{valid ? total.toLocaleString('ar-EG', { maximumFractionDigits: 2 }) : '—'} <span className="text-xs">ج.م</span></strong></div>
            </div>

            <Button className="h-14 w-full rounded-2xl bg-[#005931] text-base font-black" disabled={!valid || !isInitialized} onClick={save}>
              {existing || onSelect ? 'تأكيد الوزن' : 'إضافة للسلة'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
