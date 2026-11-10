import { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { watchNetwork } from '@/lib/nativeFeel';

/** Thin bar at the top when the connection drops, and a short "back online" note. */
export default function NetworkStatusBar() {
  const [state, setState] = useState<'online' | 'offline' | 'back'>('online');
  const wasOffline = useRef(false);

  useEffect(() => watchNetwork(online => {
    if (!online) { wasOffline.current = true; setState('offline'); return; }
    if (wasOffline.current) {
      wasOffline.current = false;
      setState('back');
      window.setTimeout(() => setState(current => (current === 'back' ? 'online' : current)), 2500);
    }
  }), []);

  if (state === 'online') return null;
  const offline = state === 'offline';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[80] flex items-center justify-center gap-2 px-3 pb-1.5 text-[12.5px] font-bold text-white ${offline ? 'bg-slate-800' : 'bg-[#005931]'}`}
      style={{ paddingTop: 'calc(var(--safe-area-top, 0px) + 6px)' }}
    >
      {offline ? <WifiOff size={15} /> : <Wifi size={15} />}
      {offline ? 'مفيش إنترنت دلوقتي — بتشوف آخر نسخة محفوظة، وهنكمّل أول ما النت يرجع' : 'النت رجع'}
    </div>
  );
}
