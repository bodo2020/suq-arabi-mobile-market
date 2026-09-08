import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Input } from './input';
import { Button } from './button';
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
  const existing = items.find(item => item.product.id === product.id && item.unit_of_measure === 'weight' && !item.is_bulk);
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
    return [...new Set([step, step * 2, step * 5, step * 10])]
      .filter(value => value > 0 && value <= maxAllowed)
      .slice(0, 4);
  }, [step, maxAllowed]);

  const amount = Number(weight);
  const valid = Number.isInteger(amount) && amount > 0 && maxAllowed > 0 && amount <= maxAllowed;
  const price = productUnitPrice(product);

  const save = () => {
    if (!valid || !isInitialized) return;
    if (onSelect) {
      onSelect(amount);
      onClose();
      return;
    }
    if (existing) updateQuantity(product.id, amount, false);
    else addToCart({ ...product, quantity: amount, price: product.price, unit_of_measure: 'weight', is_bulk: false });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">تحب وزن قد إيه؟</DialogTitle>
          <DialogDescription>
            {product.name} · {price.toFixed(2)} ج.م للكيلو · الخطوة {formatWeightAmount(step)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {presets.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {presets.map(value => (
                <Button
                  key={value}
                  type="button"
                  variant={amount === value ? 'default' : 'outline'}
                  aria-pressed={amount === value}
                  className="min-h-12 rounded-xl px-1"
                  onClick={() => setWeight(String(value))}
                >
                  {formatWeightAmount(value)}
                </Button>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="cart-weight" className="mb-2 block text-sm font-medium">أو اكتب الوزن بالجرام</label>
            <Input
              id="cart-weight"
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(1, maxAllowed)}
              step={1}
              value={weight}
              onChange={event => setWeight(event.target.value)}
              className="h-12 rounded-xl text-base"
              aria-invalid={!valid}
              aria-describedby={!valid ? 'cart-weight-error' : 'cart-weight-help'}
            />
            {!valid ? (
              <p id="cart-weight-error" className="mt-2 text-sm text-red-700">
                {maxAllowed <= 0
                  ? 'المنتج غير متاح بالوزن حاليًا في فرع عنوانك.'
                  : `اكتب وزنًا صحيحًا من 1 جم إلى ${formatWeightAmount(maxAllowed)}.`}
              </p>
            ) : (
              <p id="cart-weight-help" className="mt-2 text-xs leading-5 text-gray-500">
                تقدر تكتب أي وزن مناسب حتى {formatWeightAmount(maxAllowed)}، ومش لازم يكون من مضاعفات خطوة الزيادة.
              </p>
            )}
          </div>

          <div className="flex justify-between rounded-2xl bg-green-50 p-4">
            <span>قيمة الكمية</span>
            <strong>{valid ? (price * amount / 1000).toFixed(2) : '—'} ج.م</strong>
          </div>

          <Button className="min-h-12 w-full rounded-xl text-base" disabled={!valid || !isInitialized} onClick={save}>
            {onSelect ? 'تأكيد الوزن' : existing ? 'حفظ الوزن' : 'إضافة للسلة'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
