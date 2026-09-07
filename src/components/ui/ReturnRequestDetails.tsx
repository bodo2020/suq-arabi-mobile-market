import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ImageOff,
  Images,
  PackageOpen,
  XCircle,
} from 'lucide-react';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { ReturnRequest, ReturnRequestItem, supabase } from '@/lib/supabase';

interface ReturnRequestDetailsProps {
  request: ReturnRequest;
}

const STATUS_META = {
  pending: {
    label: 'قيد المراجعة',
    description: 'استلمنا طلبك وفريقنا بيراجع المنتجات والسبب.',
    className: 'border-amber-100 bg-amber-50 text-amber-800',
    icon: Clock3,
  },
  approved: {
    label: 'تمت الموافقة',
    description: 'تمت الموافقة على طلب الاسترجاع. راجع ملاحظات الإدارة للتفاصيل.',
    className: 'border-green-100 bg-green-50 text-green-800',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'تم الرفض',
    description: 'لم تتم الموافقة على الطلب. راجع ملاحظات الإدارة لمعرفة السبب.',
    className: 'border-red-100 bg-red-50 text-red-800',
    icon: XCircle,
  },
} as const;

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'تاريخ غير معروف';
  }
};

const ReturnRequestDetails: React.FC<ReturnRequestDetailsProps> = ({ request }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const status = STATUS_META[request.status] || STATUS_META.pending;
  const StatusIcon = status.icon;

  const {
    data: items = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['return-request-items', request.id],
    enabled: expanded,
    staleTime: 60_000,
    queryFn: async (): Promise<ReturnRequestItem[]> => {
      const { data, error } = await supabase
        .from('return_request_items')
        .select('*, products(*)')
        .eq('return_request_id', request.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ReturnRequestItem[];
    },
  });

  const images = request.images || [];

  return (
    <article className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">طلب استرجاع</p>
            <h2 dir="ltr" className="mt-1 break-all text-right text-lg font-bold">
              #{request.id.slice(0, 8).toUpperCase()}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>{formatDate(request.created_at)}</span>
              <span dir="ltr" className="text-right">الطلب الأصلي #{request.order_id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>

          <div className={`rounded-2xl border px-4 py-3 ${status.className}`}>
            <div className="flex items-center gap-2 text-sm font-bold">
              <StatusIcon size={18} />
              {status.label}
            </div>
            <p className="mt-1 max-w-xs text-xs leading-5 opacity-90">{status.description}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-500">سبب الاسترجاع</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">{request.reason}</p>
        </div>

        {request.admin_notes && (
          <div className={`mt-3 rounded-2xl border p-4 ${request.status === 'rejected' ? 'border-red-100 bg-red-50/60' : 'border-green-100 bg-green-50/60'}`}>
            <p className="text-xs font-semibold text-gray-600">ملاحظات الإدارة</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">{request.admin_notes}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold transition hover:bg-gray-50"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          {expanded ? 'إخفاء التفاصيل' : 'عرض المنتجات والصور'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <PackageOpen size={19} className="text-primary" />
              <h3 className="font-bold">المنتجات المطلوب استرجاعها</h3>
            </div>

            {isLoading ? (
              <div className="flex min-h-32 items-center justify-center">
                <BrandLoader size="sm" label="جاري تحميل المنتجات" />
              </div>
            ) : isError ? (
              <div role="alert" className="mt-4 rounded-2xl border border-red-100 bg-white p-5 text-center">
                <p className="text-sm font-semibold">تعذّر تحميل منتجات الاسترجاع.</p>
                <Button variant="outline" className="mt-3 rounded-xl" onClick={() => void refetch()}>
                  إعادة المحاولة
                </Button>
              </div>
            ) : items.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-gray-500">لا توجد منتجات مسجلة لهذا الطلب.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {items.map(item => (
                  <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {item.products?.image_urls?.[0] ? (
                          <img
                            src={item.products.image_urls[0]}
                            alt={item.products?.name || 'منتج'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageOff size={18} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">{item.products?.name || 'منتج'}</p>
                        <p className="mt-1 text-xs text-gray-500">الكمية: {item.quantity}</p>
                      </div>
                    </div>
                    {item.reason && (
                      <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-600">
                        {item.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {images.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-5">
              <div className="flex items-center gap-2">
                <Images size={19} className="text-primary" />
                <h3 className="font-bold">الصور المرفقة</h3>
                <span className="text-xs text-gray-500">({images.length})</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => setSelectedImage(image)}
                    className="aspect-square overflow-hidden rounded-xl border border-gray-100 bg-white"
                    aria-label={`عرض الصورة ${index + 1}`}
                  >
                    <img src={image} alt={`صورة مرفقة ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="معاينة الصورة"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-3xl" onClick={event => event.stopPropagation()}>
            <img src={selectedImage} alt="صورة مرفقة مكبرة" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow"
              aria-label="إغلاق الصورة"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default ReturnRequestDetails;
