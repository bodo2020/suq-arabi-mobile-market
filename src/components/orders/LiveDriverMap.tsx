import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = { orderId: string };
type Fix = { lat: number; lng: number; ts: number };

// OSM public tiles are best-effort for modest interactive use, not unlimited hosting.
const configuredTiles = import.meta.env.VITE_MAP_TILE_URL?.trim();
const configuredAttribution = import.meta.env.VITE_MAP_ATTRIBUTION?.trim();
const customProvider = configuredTiles?.startsWith('https://') && configuredAttribution;
const tileUrl = customProvider ? configuredTiles : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution = customProvider ? configuredAttribution : '&copy; OpenStreetMap contributors';

const driverIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;border-radius:50%;background:#005931;border:3px solid #fff;box-shadow:0 0 0 6px rgba(0,89,49,.22)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/**
 * Live driver position for one order, received over a private Realtime Broadcast channel (WebSocket).
 * Nothing is stored: if the driver is not sending (no signal, not yet picked up) the card says so.
 */
export default function LiveDriverMap({ orderId }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      await supabase.realtime.setAuth();
      if (disposed) return;
      channel = supabase
        .channel(`track:${orderId}`, { config: { private: true } })
        .on('broadcast', { event: 'pos' }, ({ payload }) => {
          const lat = Number(payload?.lat);
          const lng = Number(payload?.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          setFix({ lat, lng, ts: Number(payload?.ts) || Date.now() });
        })
        .subscribe();
    })();
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!fix || !element.current) return;
    if (!map.current) {
      map.current = L.map(element.current, { center: [fix.lat, fix.lng], zoom: 16, zoomControl: false, attributionControl: true });
      map.current.attributionControl.setPrefix(false);
      L.tileLayer(tileUrl, { maxZoom: 19, attribution }).addTo(map.current);
      marker.current = L.marker([fix.lat, fix.lng], { icon: driverIcon, interactive: false, keyboard: false }).addTo(map.current);
    } else {
      marker.current?.setLatLng([fix.lat, fix.lng]);
      map.current.panTo([fix.lat, fix.lng], { animate: true, duration: 1 });
    }
  }, [fix]);

  useEffect(() => () => {
    map.current?.remove();
    map.current = null;
    marker.current = null;
  }, []);

  const ageSeconds = fix ? Math.max(0, Math.round((now - fix.ts) / 1000)) : null;
  const stale = ageSeconds !== null && ageSeconds > 30;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white" aria-label="موقع المندوب">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold"><Navigation size={16} className="text-primary" />المندوب في الطريق</p>
        <span className={`text-xs ${stale ? 'text-amber-700' : 'text-gray-500'}`}>
          {fix === null ? 'بنستنى إشارة المندوب…' : stale ? `آخر تحديث من ${ageSeconds} ثانية` : 'مباشر'}
        </span>
      </div>
      {fix ? <div ref={element} className="h-52 w-full" aria-label="خريطة موقع المندوب" /> : null}
    </section>
  );
}
