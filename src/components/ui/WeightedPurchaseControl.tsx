import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Scale } from 'lucide-react';
import type { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { formatWeightAmount, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';
import WeightSelector from './WeightSelector';
import { Button } from './button';

const MAX_WEIGHT_GRAMS = 100000;

interface WeightedPurchaseControlProps {
  product: Product;
}

export default function WeightedPurchaseControl({ product }: WeightedPurchaseControlProps) {
  const { items, addToCart, updateQuantity, isInitialized } = useCart();
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
  const canDecrease = activeWeight > 1;
  const canIncrease = activeWeight < hardMax;

  const setWeight = (grams: number) => {
    const next = Math.min(hardMax, Math.max(1, Math.round(grams)));
    setSelectedWeight(next);
    if (existing) updateQuantity(product.id, next, false);
  };

  const decrease = () => {
    if (!canDecrease || !isInitialized) return;
    const next = activeWeight > step ? Math.max(1, activeWeight - step) : activeWeight;
    if (next !== activeWeight) setWeight(next);
  };

  const increase = () => {
    if (!canIncrease || !isInitialized) return;
    setWeight(Math.min(hardMax, activeWeight + step));
  };

  const add = () => {
    if (!isInitialized || existing) return;
    addToCart({
      ...product,
      quantity: activeWeight,
      price: product.price,
      unit_of_measure: 'weight',
      is_bulk: false,
    });
  };

  const stockLabel = useMemo(() => {
    if (stockGrams <= 0) return null;
    return formatWeightAmount(stockGrams);
  }, [stockGrams]);

  return (
    <div className="rounded-2xl border border-green-100 bg-green-50/30 p-4" dir="rtl">
      <div className="mb-3 flex items-center gap-2 font-bold text-[#005931]">
        <Scale size={19} /> شراء بالوزن
      </div>

      <div className="mb-4 rounded-xl bg-white px-3 py-2.5 text-xs leading-5 text-gray-600 shadow-sm">
        <span className="font-bold text-[#005931]">الوزن الافتراضي وخطوة الزيادة: {formatWeightAmount(step)}</span>
        <span className="mt-0.5 block">كل ضغطة على + أو − تغيّر الوزن بنفس الخطوة، وتقدر تضغط على الوزن وتكتب أي كمية تناسبك.</span>
        {stockLabel && <span className="mt-1 block text-gray-500">المتاح حاليًا تقريبًا: {stockLabel}</span>}
      </div>

      <div className="flex min-h-14 items-center justify-between overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={decrease}
          disabled={!isInitialized || !canDecrease || activeWeight <= step}
          aria-label={`تقليل الوزن بمقدار ${formatWeightAmount(step)}`}
          className="flex h-14 w-14 items-center justify-center text-[#005931] disabled:opacity-25"
        >
          <Minus size={20} />
        </button>

        <button
          type="button"
          onClick={() => setSelectorOpen(true)}
          className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-2 text-center"
          aria-label={`تعديل الوزن الحالي ${formatWeightAmount(activeWeight)}`}
        >
          <strong className="text-lg text-[#005931]">{formatWeightAmount(activeWeight)}</strong>
          <span className="mt-0.5 text-[11px] text-gray-500">اضغط لكتابة وزن مخصص</span>
        </button>

        <button
          type="button"
          onClick={increase}
          disabled={!isInitialized || !canIncrease}
          aria-label={`زيادة الوزن بمقدار ${formatWeightAmount(step)}`}
          className="flex h-14 w-14 items-center justify-center text-[#005931] disabled:opacity-25"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
        <span className="text-gray-500">القيمة التقريبية</span>
        <strong className="text-[#005931]">{total.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م</strong>
      </div>

      {!existing ? (
        <Button
          type="button"
          onClick={add}
          disabled={!isInitialized || stockGrams <= 0}
          className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl px-4"
        >
          <span className="font-semibold">إضافة للسلة</span>
          <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold">الإجمالي {total.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م</span>
        </Button>
      ) : (
        <p className="mt-3 rounded-xl bg-[#005931]/10 px-3 py-2 text-center text-xs font-semibold text-[#005931]">
          الوزن الحالي محفوظ في السلة، وأي تعديل هنا بيتحدث فورًا.
        </p>
      )}

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
