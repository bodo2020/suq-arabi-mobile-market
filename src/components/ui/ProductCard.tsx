import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Trash2, Scale, Package } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import FavoriteButton from './FavoriteButton';
import WeightSelector from './WeightSelector';

interface ProductCardProps {
  product: Product & { displayType?: 'regular' | 'bulk'; variantKey?: string };
  hideIfUnavailable?: boolean;
  showBulkQuantity?: boolean;
}
const money = (value: number) => Number(value).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const ProductCard: React.FC<ProductCardProps> = ({ product, hideIfUnavailable = false, showBulkQuantity = false }) => {
  const { items, addToCart, updateQuantity, isInitialized } = useCart();
  const [weightOpen, setWeightOpen] = useState(false);
  const weighted = product.barcode_type === 'scale' || product.unit_of_measure === 'weight';
  const bulk = !weighted && (product.displayType === 'bulk' || showBulkQuantity);
  const item = items.find(i => i.product.id === product.id && !!i.is_bulk === bulk);
  const pack = bulk ? product.bulk_quantity || 1 : 1;
  const used = items.filter(i => i.product.id === product.id).reduce((sum, i) => sum + (i.unit_of_measure === 'weight' ? i.quantity / 1000 : i.quantity * (i.is_bulk ? i.product.bulk_quantity || 1 : 1)), 0);
  const unavailable = product.quantity <= 0 || (bulk && (!product.bulk_enabled || product.quantity < pack));
  const limit = used + pack > product.quantity;
  const price = bulk ? product.bulk_price || 0 : product.offer_price || product.price || 0;
  const discount = !bulk && product.price > price ? Math.round((1 - price / product.price) * 100) : 0;
  if (hideIfUnavailable && unavailable) return null;
  const add = () => {
    if (!isInitialized || unavailable) return;
    if (weighted) return setWeightOpen(true);
    if (limit) return;
    if (item) updateQuantity(product.id, item.quantity + 1, bulk);
    else addToCart({ ...product, price: product.price, quantity: 1, is_bulk: bulk });
  };
  return <article className="relative flex h-full min-w-0 flex-col rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md" dir="rtl">
    <div className="absolute left-2 top-2 z-10 rounded-full bg-white/95"><FavoriteButton productId={product.id} size="sm" /></div>
    <Link to={`/product/${product.id}`} className="group rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-gray-50 p-3">
        <img src={product.image_urls?.[0] || '/placeholder.svg'} alt={product.name} loading="lazy" decoding="async" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }} className="h-full w-full object-contain transition-transform motion-safe:group-hover:scale-105" />
        {discount > 0 && <span className="absolute right-1 top-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">خصم {money(discount)}٪</span>}
      </div>
      <h3 className="mb-2 min-h-10 line-clamp-2 text-sm font-semibold leading-5 text-gray-900">{product.name}</h3>
    </Link>
    <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">{weighted ? <><Scale size={14} /> السعر للكيلو</> : bulk ? <><Package size={14} /> عبوة {pack} قطعة</> : 'سعر القطعة'}</p>
    <div className="mb-3 mt-auto flex flex-wrap items-baseline gap-2"><strong className="text-lg text-[#005931]">{money(price)} <span className="text-xs font-medium">ج.م</span></strong>{discount > 0 && <del className="text-xs text-gray-400">{money(product.price)}</del>}</div>
    {unavailable ? <button disabled className="min-h-11 rounded-xl bg-gray-100 text-sm text-gray-500">غير متوفر حاليًا</button> : weighted ? <button disabled={!isInitialized} onClick={add} className="min-h-11 rounded-xl bg-[#005931] px-2 text-sm font-semibold text-white disabled:opacity-50">{item ? `${money(item.quantity)} جم · تعديل` : 'اختار الوزن'}</button> : item ? <div className="flex items-center justify-between rounded-xl bg-green-50 text-[#005931]">
      <button disabled={!isInitialized} onClick={() => updateQuantity(product.id, item.quantity - 1, bulk)} aria-label={item.quantity === 1 ? `حذف ${product.name} من السلة` : `تقليل كمية ${product.name}`} className="flex h-11 w-11 items-center justify-center rounded-xl">{item.quantity === 1 ? <Trash2 size={18} /> : <Minus size={18} />}</button>
      <span aria-live="polite" className="text-sm font-bold">{money(item.quantity)}</span>
      <button disabled={!isInitialized || limit} onClick={add} aria-label={`زيادة كمية ${product.name}`} className="flex h-11 w-11 items-center justify-center rounded-xl disabled:opacity-30"><Plus size={18} /></button>
    </div> : <button disabled={!isInitialized || limit} onClick={add} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#005931] px-2 text-sm font-semibold text-white disabled:opacity-40"><Plus size={18} />{limit ? 'الكمية في السلة' : 'إضافة للسلة'}</button>}
    {weightOpen && <WeightSelector product={product} isOpen={weightOpen} onClose={() => setWeightOpen(false)} />}
  </article>;
};
export default React.memo(ProductCard);
