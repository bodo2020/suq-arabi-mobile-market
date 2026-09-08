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
  const startingWeight = Math.min(
    MAX_WEIGHT_GRAMS,
    Math.max(1, Math.round(Number(initialWeight || existing?.quantity || step))),
  );
  const [weight, setWeight] = useState(String(startingWeight));

  useEffect(() => {
    if (isOpen) {
      const next = Math.min(
        MAX_WEIGHT_GRAMS,
        Math.max(1, Math.round(Number(initialWeight || existing?.quantity || step))),
      );
      setWeight(String(next));
    }
  }, [isOpen, initialWeight, existing?.quantity, step]);

  const presets = useMemo(() => {
    return [...new Set([step, step * 2, step * 5, step * 10])]
      .filter(value => value > 0 && value <= MAX_WEIGHT_GRAMS)
      .slice(0, 4);
  }, [step]);

  const amount = Number(weight);
  const valid = Number.isInteger(amount) && amount > 0 && amount <= MAX_WEIGHT_GRAMS;
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

          <div>
            <label htmlFor="cart-weight" className="mb-2 block text-sm font-medium">أو اكتب الوزن بالجرام</label>
            <Input
              id="cart-weight"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_WEIGHT_GRAMS}
              step={1}
              value={weight}
              onChange={event => setWeight(event.target.value)}
              className="h-12 rounded-xl text-base"
              aria-invalid={!valid}
              aria-describedby={!valid ? 'cart-weight-error' : 'cart-weight-help'}
            />
            {!valid ? (
              <p id="cart-weight-error" className="mt-2 text-sm text-red-700">اكتب وزنًا صحيحًا من ١ جم إلى ١٠٠ كجم.</p>
            ) : (
              <p id="cart-weight-help" className="mt-2 text-xs leading-5 text-gray-500">
                تقدر تكتب أي وزن مناسب، ومش لازم يكون من مضاعفات خطوة الزيادة.
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
