import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
const CHECKED_KEY = 'appUpdateCheckedAt';
// Updates marked this urgent in Play Console cannot be postponed.
const FORCED_PRIORITY = 4;

const readChecked = () => {
  try { return Number(localStorage.getItem(CHECKED_KEY)) || 0; } catch { return 0; }
};
const writeChecked = (value: number) => {
  try { localStorage.setItem(CHECKED_KEY, String(value)); } catch { /* private mode */ }
};

/**
 * Android only: when a newer version is on Google Play, ask the customer to go and update it.
 * "حدّث الآن" runs Google's in-app update (or opens the Play page when that is not allowed).
 */
export default function AppUpdatePrompt() {
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const [immediate, setImmediate] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const check = async (force = false) => {
      if (busy.current) return;
      if (!force && Date.now() - readChecked() < CHECK_EVERY_MS) return;
      busy.current = true;
      try {
        const info = await AppUpdate.getAppUpdateInfo();
        writeChecked(Date.now());
        if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
          setImmediate(Boolean(info.immediateUpdateAllowed));
          setForced((info.updatePriority ?? 0) >= FORCED_PRIORITY);
          setOpen(true);
        }
      } catch {
        // Not installed from Google Play (debug build, sideload) or Play unavailable: nothing to offer.
      } finally {
        busy.current = false;
      }
    };

    const timer = window.setTimeout(() => void check(), 4000);
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const update = async () => {
    try {
      if (immediate) await AppUpdate.performImmediateUpdate();
      else await AppUpdate.openAppStore();
    } catch {
      try { await AppUpdate.openAppStore(); } catch { /* nothing else to try */ }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={next => { if (!forced) setOpen(next); }}>
      <AlertDialogContent dir="rtl" className="max-w-sm rounded-3xl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>في تحديث جديد لسوبر ماركو</AlertDialogTitle>
          <AlertDialogDescription className="leading-7">
            حدّث التطبيق من جوجل بلاي عشان تاخد آخر التحسينات والإصلاحات.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
          <AlertDialogAction onClick={() => void update()} className="min-h-12 rounded-xl">حدّث الآن</AlertDialogAction>
          {!forced && <AlertDialogCancel className="min-h-12 rounded-xl">بعدين</AlertDialogCancel>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
