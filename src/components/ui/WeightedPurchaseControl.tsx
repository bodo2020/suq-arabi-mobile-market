import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { formatWeightAmount, productWeightStepGrams } from '@/lib/productPurchase';
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

  useEffect(() => {
    const next = Math.min(hardMax, Math.max(1, Math.round(Number(existing?.quantity || step))));
    setSelectedWeight(next);
  }, [product.id, existing?.quantity, step, hardMax]);

  const activeWeight = Math.min(hardMax, Math.max(1, Math.round(Number(existing?.quantity || selectedWeight))));
  const canIncrease = activeWeight < hardMax;

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
    if (!isInitialized || !existing) return;
    if (activeWeight <= step) {
      removeFromCart(product.id, false);
      return;
    }
    updateQuantity(product.id, Math.max(1, activeWeight - step), false);
  };

  const increase = () => {
    if (!isInitialized || !existing || !canIncrease) return;
    updateQuantity(product.id, Math.min(hardMax, activeWeight + step), false);
  };

  if (!existing) {
    return (
      <button
        type="button"
        onClick={addSelectedWeight}
        disabled={!isInitialized || stockGrams <= 0}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#005931] px-4 font-semibold text-white disabled:opacity-40"
        aria-label={`إضافة المنتج للسلة بوزن ${formatWeightAmount(activeWeight)}`}
      >
        <Plus size={19} />
        إضافة للسلة
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-white p-3" dir="rtl">
      <div className="flex min-h-14 items-center justify-between overflow-hidden rounded-2xl bg-green-50 text-[#005931]">
        <button
          type="button"
          onClick={decrease}
          disabled={!isInitialized}
          aria-label={activeWeight <= step ? 'حذف المنتج من السلة' : `تقليل الوزن بمقدار ${formatWeightAmount(step)}`}
          className="flex h-14 w-14 items-center justify-center disabled:opacity-25"
        >
          {activeWeight <= step ? <Trash2 size={20} /> : <Minus size={20} />}
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
          disabled={!isInitialized || !canIncrease}
          aria-label={`زيادة الوزن بمقدار ${formatWeightAmount(step)}`}
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
