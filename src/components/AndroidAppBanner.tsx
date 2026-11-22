import { useState } from 'react';
import { isAndroidWebBrowser, PLAY_STORE_URL } from '@/lib/appDownload';

const DISMISS_KEY = 'androidAppBannerDismissed';

/** Android phone browsers only: invite the customer to install the app from Google Play. */
export default function AndroidAppBanner() {
  const [open, setOpen] = useState(() => {
    if (!isAndroidWebBrowser()) return false;
    try { return sessionStorage.getItem(DISMISS_KEY) !== '1'; } catch { return true; }
  });

  if (!open) return null;

  const close = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode: just hide it */ }
    setOpen(false);
  };

  return (
    <div dir="rtl" className="fixed inset-x-3 bottom-20 z-[60] flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-lg md:bottom-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">حمّل تطبيق سوبر ماركو</p>
        <p className="text-xs text-gray-500">تجربة أسرع وطلبات أسهل من الموبايل</p>
      </div>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
      >
        حمّل
      </a>
      <button type="button" onClick={close} aria-label="إغلاق" className="shrink-0 px-1 text-xl leading-none text-gray-400">
        ×
      </button>
    </div>
  );
}
