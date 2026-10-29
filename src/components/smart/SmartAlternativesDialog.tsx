import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SmartProductChoiceCard from './SmartProductChoiceCard';
import type { Product } from '@/lib/supabase';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: string;
  products: Product[];
  currentId?: string;
  onPick: (product: Product) => void;
};

/** A visual, price-aware chooser, never a product-name-only select. */
export default function SmartAlternativesDialog({
  open, onOpenChange, ingredient, products, currentId, onPick,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="flex max-h-[88dvh] w-[calc(100vw-24px)] max-w-xl flex-col overflow-hidden rounded-[26px] border-emerald-100 bg-[#f6f8f7] p-0 sm:rounded-3xl"
      >
        <DialogHeader className="shrink-0 border-b border-emerald-100 bg-white px-4 py-4 text-right">
          <DialogTitle className="text-right text-lg font-black text-slate-900">
            بدائل {ingredient}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-3 pb-6 pt-3" dir="rtl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map(product => (
              <SmartProductChoiceCard
                key={product.id}
                product={product}
                selected={currentId === product.id}
                onSelect={() => { onPick(product); onOpenChange(false); }}
              />
            ))}
          </div>
          {!products.length && <p className="py-10 text-center text-sm text-slate-500">مفيش بدائل متاحة دلوقتي</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
