import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Input } from './input';
import { Button } from './button';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';

export default function WeightSelector({ product, isOpen, onClose }: { product: Product; isOpen: boolean; onClose: () => void }) {
  const { items, addToCart, updateQuantity, isInitialized } = useCart();
  const existing = items.find(item => item.product.id === product.id && item.unit_of_measure === 'weight' && !item.is_bulk);
  const [weight, setWeight] = useState(String(existing?.quantity || 250));
  const amount = Number(weight);
  const maxWeight = Math.min(100000, Math.floor(Number(product.quantity) * 1000));
  const valid = Number.isInteger(amount) && amount > 0 && amount <= maxWeight;
  const price = product.offer_price || product.price || 0;
  const save = () => {
    if (!valid || !isInitialized) return;
    if (existing) updateQuantity(product.id, amount, false);
    else addToCart({ ...product, quantity: amount, price: product.price, unit_of_measure: 'weight', is_bulk: false });
    onClose();
  };
  return <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-w-md rounded-3xl" dir="rtl"><DialogHeader><DialogTitle className="text-xl">تحب وزن قد إيه؟</DialogTitle><DialogDescription>{product.name} · {price.toFixed(2)} ج.م للكيلو</DialogDescription></DialogHeader><div className="space-y-5 pt-3"><div className="grid grid-cols-4 gap-2">{[250, 500, 750, 1000].map(value => <Button key={value} variant={amount === value ? 'default' : 'outline'} aria-pressed={amount === value} className="min-h-12 px-1 rounded-xl" onClick={() => setWeight(String(value))}>{value === 1000 ? '١ كيلو' : `${value} جم`}</Button>)}</div><div><label htmlFor="cart-weight" className="block text-sm font-medium mb-2">أو اكتب الوزن بالجرام</label><Input id="cart-weight" type="number" inputMode="numeric" min={1} max={maxWeight} step={1} value={weight} onChange={event => setWeight(event.target.value)} className="h-12 rounded-xl text-base" aria-invalid={!valid} aria-describedby={!valid ? 'cart-weight-error' : undefined} />{!valid && <p id="cart-weight-error" className="text-sm text-red-700 mt-2">اكتب وزنًا صحيحًا من ١ إلى {maxWeight.toLocaleString('ar-EG')} جرام حسب المتاح.</p>}</div><div className="flex justify-between rounded-2xl bg-green-50 p-4"><span>قيمة الكمية</span><strong>{valid ? (price * amount / 1000).toFixed(2) : '—'} ج.م</strong></div><Button className="w-full min-h-12 rounded-xl text-base" disabled={!valid || !isInitialized} onClick={save}>{existing ? 'حفظ الوزن' : 'إضافة للسلة'}</Button></div></DialogContent></Dialog>;
}
