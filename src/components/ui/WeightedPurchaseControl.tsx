import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { formatWeightAmount, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';
import WeightSelector from './WeightSelector';

const MAX_WEIGHT_GRAMS = 100000;

interface WeightedPurchaseControlProps {
  product: Product;
  onWeightChange?: (grams: number) => void;
}

export default function WeightedPurchaseControl({ product, onWeightChange }: WeightedPurchaseControlProps) {
  const { items, addToCart, updateQuantity, removeFromCart, isInitialized } = useCart();
  const existing = items.find(item => item.product.id === product.id && item.unit_of_measure === 'weight' && !item.is_bulk);
  const step = productWeightStepGrams(product);
  const stockGrams = Math.max(0, Math.floor(Number(product.quantity || 0) * 1000));
  const hardMax = stockGrams > 0 ? Math.min(MAX_WEIGHT_GRAMS, stockGrams) : MAX_WEIGHT_GRAMS;
  const startingWeight = Math.min(hardMax, Math.max(1, Math.round(Number(existing?.quantity || step))));
  const [selectedWeight, setSelectedWeight] = useState(startingWeight);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const price = productUnitPrice(product);

  useEffect(() => {
    const next = Math.min(hardMax, Math.max(1, Math.round(Number(existing?.quantity || step))));
    setSelectedWeight(next);
  }, [product.id, existing?.quantity, step, hardMax]);

  const activeWeight = Math.min(hardMax, Math.max(1, Math.round(Number(existing?.quantity || selectedWeight))));
  const total = price * activeWeight / 1000;
  const canIncrease = activeWeight < hardMax;
  const canDecrease = activeWeight > step;

  useEffect(() => {
    onWeightChange?.(activeWeight);
  }, [activeWeight, onWeightChange]);

  const setWeight = (grams: number) => {
    const next = Math.min(hardMax, Math.max(1, Math.round(grams)));
    setSelectedWeight(next);
    if (existing) updateQuantity(product.id, next, false);
  };

  const addSelectedWeight = () => {
    if (!isInitialized || existing || stockGrams <= 0) return;
    addToCart({
      ...product,
      quantity: activeWeight,
      price: product.price,
      unit_of_measure: 'weight',
      is_bulk: false,
    });
  };

  const decrease = () => {
    if (!isInitialized) return;
    if (existing) {
      if (activeWeight <= step) {
        removeFromCart(product.id, false);
        return;
      }
      updateQuantity(product.id, Math.max(1, activeWeight - step), false);
      return;
    }
    if (canDecrease) setWeight(activeWeight - step);
  };

  const increase = () => {
    if (!isInitialized || !canIncrease) return;
    if (!existing) {
      addSelectedWeight();
      return;
    }
    updateQuantity(product.id, Math.min(hardMax, activeWeight + step), false);
  };

  return (
    <div className="rounded-2xl border border-green-100 bg-white p-3" dir="rtl">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
        <strong className="text-2xl text-[#005931]">
          {total.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
        </strong>
        <span className="text-sm font-semibold text-[#005931]">/ {formatWeightAmount(activeWeight)}</span>
      </div>

      <div className="flex min-h-14 items-center justify-between overflow-hidden rounded-2xl bg-green-50 text-[#005931]">
        <button
          type="button"
          onClick={decrease}
          disabled={!isInitialized || (!existing && !canDecrease)}
          aria-label={existing && activeWeight <= step ? 'حذف المنتج من السلة' : `تقليل الوزن بمقدار ${formatWeightAmount(step)}`}
          className="flex h-14 w-14 items-center justify-center disabled:opacity-25"
        >
          {existing && activeWeight <= step ? <Trash2 size={20} /> : <Minus size={20} />}
        </button>

        <button
          type="button"
          onClick={() => setSelectorOpen(true)}
          className="min-w-0 flex-1 px-3 text-center"
          aria-label={`تعديل الوزن الحالي ${formatWeightAmount(activeWeight)}`}
        >
          <strong className="text-lg">{formatWeightAmount(activeWeight)}</strong>
        </button>

        <button
          type="button"
          onClick={increase}
          disabled={!isInitialized || !canIncrease || stockGrams <= 0}
          aria-label={existing ? `زيادة الوزن بمقدار ${formatWeightAmount(step)}` : `إضافة ${formatWeightAmount(activeWeight)} للسلة`}
          className="flex h-14 w-14 items-center justify-center disabled:opacity-25"
        >
          <Plus size={21} />
        </button>
      </div>

      <WeightSelector
        product={product}
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        initialWeight={activeWeight}
        onSelect={setWeight}
      />
    </div>
  );
}
