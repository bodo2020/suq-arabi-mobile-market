import { useEffect, useRef, useState } from 'react';
import { ScanBarcode, X, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
  finding?: boolean;
};

/** Camera code is only downloaded when the scanner opens, keeping the search
 * route light. Cleanup stops the stream on close, route changes and unmount. */
export default function SearchBarcodeScanner({ onDetected, onClose, finding = false }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const detectedRef = useRef(false);
  const detectedCallback = useRef(onDetected);
  detectedCallback.current = onDetected;

  useEffect(() => {
    let disposed = false;
    let scanner: import('html5-qrcode').Html5Qrcode | null = null;
    detectedRef.current = false;
    setCameraError('');

    const begin = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (disposed) return;
        scanner = new Html5Qrcode('smart-search-barcode-reader');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 260, height: 125 }, aspectRatio: 1.777778 },
          value => {
            if (detectedRef.current || !value.trim()) return;
            detectedRef.current = true;
            detectedCallback.current(value.trim());
          },
          () => undefined,
        );
        if (disposed && scanner.isScanning) await scanner.stop();
      } catch (error) {
        if (!disposed) {
          console.error('Unable to open barcode camera', error);
          setCameraError('تعذّر فتح الكاميرا. راجع إذن الكاميرا أو جرّب مرة تانية.');
        }
      }
    };
    void begin();
    return () => {
      disposed = true;
      if (scanner?.isScanning) {
        void scanner.stop().catch(() => undefined);
      }
    };
  }, [attempt]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-3" role="dialog" aria-modal="true" aria-label="قارئ باركود المنتجات">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-[#005931]">
              <ScanBarcode size={22} strokeWidth={1.85} />
            </span>
            <div>
              <h2 className="font-extrabold text-slate-900">امسح باركود المنتج</h2>
              <p className="text-xs text-slate-500">قرّب الباركود من الكاميرا</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق الماسح" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100">
            <X size={21} />
          </button>
        </div>
        <div className="p-4">
          <div className="relative min-h-[245px] overflow-hidden rounded-[20px] bg-black">
            <div id="smart-search-barcode-reader" className="min-h-[245px] w-full" />
            <div className="pointer-events-none absolute inset-5 rounded-2xl border-2 border-white/60" />
            <div className="pointer-events-none absolute inset-x-10 top-1/2 h-[2px] bg-emerald-400/80" />
            {finding && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/65 text-sm font-bold text-white" role="status">
                جاري البحث عن المنتج…
              </div>
            )}
          </div>
          {cameraError ? (
            <div className="mt-4 space-y-3" role="alert">
              <p className="text-center text-sm text-rose-600">{cameraError}</p>
              <Button variant="outline" className="w-full" onClick={() => setAttempt(value => value + 1)}>
                <RefreshCcw size={16} className="ml-2" /> إعادة تشغيل الكاميرا
              </Button>
            </div>
          ) : null}
          <Button variant="outline" className="mt-4 min-h-11 w-full rounded-2xl" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}
