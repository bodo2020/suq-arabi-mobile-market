import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Check, ImagePlus, Minus, Plus, X } from 'lucide-react';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

interface ReturnRequestFormProps {
  orderId: string;
  orderItems: any[];
  onSuccess?: () => void;
}

type SelectedMap = Record<string, boolean>;
type QuantityMap = Record<string, number>;
type ReasonMap = Record<string, string>;

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const errorMessage = (error: any) => {
  const message = String(error?.message || error?.details || '');

  if (message.includes('order_not_delivered')) return 'الاسترجاع متاح بعد تسليم الطلب فقط.';
  if (message.includes('order_not_found')) return 'الطلب غير موجود أو لا يخص حسابك.';
  if (message.includes('product_not_in_order')) return 'أحد المنتجات المختارة غير موجود في الطلب الأصلي.';
  if (message.includes('return_quantity_exceeds_order')) return 'الكمية المطلوبة أكبر من الكمية المتاحة للاسترجاع.';
  if (message.includes('invalid_return_quantity')) return 'راجع كمية المنتجات المطلوب استرجاعها.';
  if (message.includes('return_items_required')) return 'اختار منتج واحد على الأقل للاسترجاع.';
  if (message.includes('too_many_return_items')) return 'عدد المنتجات في طلب الاسترجاع أكبر من المسموح.';
  if (message.includes('too_many_return_images')) return 'يمكن إرفاق 5 صور بحد أقصى.';
  if (message.includes('invalid_return_reason')) return 'اكتب سببًا واضحًا للاسترجاع من 3 أحرف على الأقل.';
  if (message.includes('not_authenticated')) return 'سجّل دخولك أولًا لإرسال طلب الاسترجاع.';

  return 'لم نتمكن من إرسال طلب الاسترجاع. حاول مرة أخرى.';
};

const ReturnRequestForm: React.FC<ReturnRequestFormProps> = ({ orderId, orderItems, onSuccess }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedMap>({});
  const [itemReasons, setItemReasons] = useState<ReasonMap>({});
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [previews]);

  const selectedCount = useMemo(
    () => Object.values(selectedItems).filter(Boolean).length,
    [selectedItems],
  );

  const itemKey = (item: any) => String(item.product_id || item.id || '');

  const handleItemSelect = (item: any) => {
    const key = itemKey(item);
    if (!key) return;

    setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }));
    setQuantities(prev => ({ ...prev, [key]: prev[key] || 1 }));
  };

  const handleQuantityChange = (item: any, nextValue: number) => {
    const key = itemKey(item);
    const maxQuantity = Math.max(1, Number(item.quantity || 1));
    const safeValue = Math.min(maxQuantity, Math.max(1, nextValue));
    setQuantities(prev => ({ ...prev, [key]: safeValue }));
  };

  const addImages = (files: File[]) => {
    const availableSlots = MAX_IMAGES - images.length;
    if (availableSlots <= 0) {
      toast({ title: 'الحد الأقصى 5 صور', variant: 'destructive' });
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'الملف لازم يكون صورة', description: file.name, variant: 'destructive' });
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast({ title: 'الصورة أكبر من 5 ميجابايت', description: file.name, variant: 'destructive' });
        continue;
      }
      validFiles.push(file);
    }

    const accepted = validFiles.slice(0, availableSlots);
    if (validFiles.length > availableSlots) {
      toast({ title: 'تم اختيار أول 5 صور فقط' });
    }

    if (!accepted.length) return;
    setImages(prev => [...prev, ...accepted]);
    setPreviews(prev => [...prev, ...accepted.map(file => URL.createObjectURL(file))]);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addImages(files);
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, currentIndex) => currentIndex !== index));
    setPreviews(prev => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const uploadImages = async () => {
    const uploadedUrls: string[] = [];

    for (const file of images) {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const randomName = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const filePath = `returns/${randomName}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('returns')
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('returns').getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    if (!user) {
      toast({ title: 'يجب تسجيل الدخول', description: 'سجّل دخولك لإرسال طلب الاسترجاع.', variant: 'destructive' });
      return;
    }

    const selected = orderItems.filter(item => selectedItems[itemKey(item)]);
    if (!selected.length) {
      toast({ title: 'اختار منتجًا للاسترجاع', description: 'حدد منتج واحد على الأقل.', variant: 'destructive' });
      return;
    }

    const cleanReason = reason.trim();
    if (cleanReason.length < 3) {
      toast({ title: 'سبب الاسترجاع مطلوب', description: 'اكتب سببًا واضحًا من 3 أحرف على الأقل.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const uploadedImageUrls = images.length ? await uploadImages() : [];
      const itemsPayload = selected.map(item => {
        const key = itemKey(item);
        return {
          product_id: item.product_id || item.id,
          quantity: quantities[key] || 1,
          reason: itemReasons[key]?.trim() || '',
        };
      });

      const { error } = await (supabase as any).rpc('create_customer_return_request', {
        p_order_id: orderId,
        p_reason: cleanReason,
        p_items: itemsPayload,
        p_images: uploadedImageUrls,
      });

      if (error) throw error;

      toast({
        title: 'تم إرسال طلب الاسترجاع',
        description: 'طلبك وصل وهتقدر تتابع حالة المراجعة من صفحة طلبات الاسترجاع.',
      });
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting return request:', error);
      toast({ title: 'تعذّر إرسال الطلب', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">اختار المنتجات</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">حدد المنتج والكمية اللي محتاج ترجعها.</p>
          </div>
          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-primary">
            {selectedCount} مختار
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {orderItems.map((item, index) => {
            const key = itemKey(item);
            if (!key) return null;
            const selected = !!selectedItems[key];
            const maxQuantity = Math.max(1, Number(item.quantity || 1));
            const quantity = quantities[key] || 1;
            const name = item.name || item.product?.name || 'منتج';
            const imageUrl = item.image_url || item.image_urls?.[0] || '/placeholder.svg';

            return (
              <div
                key={`${key}-${index}`}
                className={`rounded-2xl border p-4 transition ${selected ? 'border-green-200 bg-green-50/40' : 'border-gray-100 bg-white'}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleItemSelect(item)}
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white'}`}
                    aria-label={selected ? `إلغاء اختيار ${name}` : `اختيار ${name}`}
                    aria-pressed={selected}
                  >
                    {selected && <Check size={15} />}
                  </button>

                  <img src={imageUrl} alt={name} className="h-16 w-16 shrink-0 rounded-xl bg-gray-50 object-cover" />

                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => handleItemSelect(item)} className="block w-full text-right">
                      <p className="line-clamp-2 text-sm font-semibold">{name}</p>
                      <p className="mt-1 text-xs text-gray-500">الكمية في الطلب: {maxQuantity}</p>
                    </button>
                  </div>
                </div>

                {selected && (
                  <div className="mt-4 space-y-3 border-t border-green-100 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">كمية الاسترجاع</span>
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, quantity - 1)}
                          disabled={quantity <= 1}
                          className="flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-30"
                          aria-label="تقليل الكمية"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="min-w-8 text-center text-sm font-bold">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, quantity + 1)}
                          disabled={quantity >= maxQuantity}
                          className="flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-30"
                          aria-label="زيادة الكمية"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <Textarea
                      value={itemReasons[key] || ''}
                      onChange={event => setItemReasons(prev => ({ ...prev, [key]: event.target.value }))}
                      placeholder="ملاحظة عن المنتج (اختياري)"
                      rows={2}
                      maxLength={500}
                      className="resize-none rounded-xl bg-white"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">سبب الاسترجاع</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">اشرح المشكلة باختصار عشان نقدر نراجع طلبك بسرعة.</p>
        <Textarea
          value={reason}
          onChange={event => setReason(event.target.value)}
          placeholder="مثال: المنتج وصل تالف أو مختلف عن المطلوب..."
          rows={4}
          maxLength={1000}
          className="mt-4 resize-none rounded-xl"
        />
        <p className="mt-2 text-left text-xs text-gray-400" dir="ltr">{reason.length}/1000</p>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Camera size={19} className="text-primary" />
              <h2 className="text-lg font-bold">صور توضيحية</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-gray-500">اختياري — الصور بتساعدنا نراجع الحالة أسرع. حد أقصى 5 صور، 5MB للصورة.</p>
          </div>
          <span className="shrink-0 text-xs text-gray-500">{images.length}/{MAX_IMAGES}</span>
        </div>

        {previews.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {previews.map((preview, index) => (
              <div key={preview} className="relative aspect-square overflow-hidden rounded-xl border border-gray-100">
                <img src={preview} alt={`معاينة ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute left-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white"
                  aria-label={`حذف الصورة ${index + 1}`}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length < MAX_IMAGES && (
          <label className="mt-4 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-green-200 bg-green-50/50 px-4 text-sm font-semibold text-primary hover:bg-green-50">
            <ImagePlus size={19} />
            إضافة صور
            <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImageChange} />
          </label>
        )}
      </section>

      <Button type="submit" className="min-h-14 w-full rounded-xl text-base" disabled={loading || selectedCount === 0}>
        {loading ? <><BrandLoader size="sm" className="ml-2" />جاري إرسال الطلب…</> : 'إرسال طلب الاسترجاع'}
      </Button>
    </form>
  );
};

export default ReturnRequestForm;
