import { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed, Search } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import BrandLoader from './BrandLoader';
import { loadGoogleMaps } from '@/lib/googleMaps';

export type Coordinates = { lat: number; lng: number };
export default function DeliveryMap({ value, onChange }: { value: Coordinates | null; onChange: (value: Coordinates) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const geocoder = useRef<any>(null);
  const selected = useRef(false);
  const callback = useRef(onChange);
  callback.current = onChange;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const listeners: Array<{ remove: () => void }> = [];
    const failure = () => { if (alive.current) setError('الخريطة غير متاحة حاليًا. تقدر تكمّل بكتابة العنوان.'); };
    const browser = window as unknown as { gm_authFailure?: () => void };
    const previous = browser.gm_authFailure;
    browser.gm_authFailure = failure;
    loadGoogleMaps().then(sdk => {
      if (!alive.current || !element.current) return;
      map.current = new sdk.maps.Map(element.current, { center: value || { lat: 30.0444, lng: 31.2357 }, zoom: value ? 17 : 12, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, gestureHandling: 'cooperative' });
      geocoder.current = new sdk.maps.Geocoder();
      listeners.push(map.current.addListener('dragstart', () => { selected.current = true; }));
      listeners.push(map.current.addListener('click', (event: any) => { if (event.latLng) { selected.current = true; map.current.panTo(event.latLng); } }));
      listeners.push(map.current.addListener('idle', () => {
        if (!alive.current || !selected.current) return;
        const center = map.current.getCenter();
        if (center) callback.current({ lat: center.lat(), lng: center.lng() });
      }));
      setReady(true);
    }).catch(failure);
    return () => { alive.current = false; listeners.forEach(listener => listener.remove()); map.current = null; if (browser.gm_authFailure === failure) browser.gm_authFailure = previous; };
  }, []);
  const move = (coordinates: Coordinates) => {
    if (!alive.current || !map.current) return;
    selected.current = true;
    map.current.setCenter(coordinates);
    map.current.setZoom(17);
    callback.current(coordinates);
  };
  const locate = () => {
    if (!navigator.geolocation) { setError('جهازك لا يدعم تحديد الموقع. ابحث عن عنوانك أو حدده على الخريطة.'); return; }
    setBusy(true); setError('');
    navigator.geolocation.getCurrentPosition(position => {
      if (!alive.current) return;
      move({ lat: position.coords.latitude, lng: position.coords.longitude }); setBusy(false);
    }, () => { if (alive.current) { setBusy(false); setError('تعذر تحديد موقعك. اسمح بالوصول للموقع أو ابحث عن عنوانك.'); } }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  const find = () => {
    if (!search.trim() || !geocoder.current || busy) return;
    setBusy(true); setError('');
    geocoder.current.geocode({ address: search.trim(), region: 'eg' }, (results: any[], status: string) => {
      if (!alive.current) return;
      setBusy(false);
      if (status !== 'OK' || !results?.[0]) { setError('ملقيناش العنوان. جرّب اسم الشارع مع المنطقة أو حرّك الخريطة.'); return; }
      const point = results[0].geometry.location;
      move({ lat: point.lat(), lng: point.lng() });
    });
  };
  return <section className="space-y-3" aria-label="تحديد موقع التوصيل">
    <div className="flex gap-2"><Input aria-label="ابحث عن شارع أو منطقة" placeholder="اسم الشارع أو المنطقة" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); find(); } }} className="h-12 rounded-xl" /><Button type="button" variant="outline" onClick={find} disabled={!ready || busy || !search.trim()} className="h-12 rounded-xl" aria-label="بحث على الخريطة"><Search size={20} /></Button></div>
    <div className="relative overflow-hidden rounded-2xl border bg-slate-50"><div ref={element} style={{ height: 340 }} aria-label="خريطة Google؛ حرّك الخريطة لتحديد موقع التوصيل" />{ready && <MapPin className="absolute pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-[#005931] fill-white" size={38} aria-hidden="true" />}{!ready && <div className="absolute inset-0 flex items-center justify-center gap-3 p-6 text-center">{!error && <BrandLoader size="md" />}<span>{error || 'بنحمّل الخريطة'}</span></div>}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-600">حرّك الخريطة لحد ما الدبوس يبقى عند باب البيت.</p><Button type="button" variant="outline" onClick={locate} disabled={!ready || busy} className="min-h-11 rounded-xl"><LocateFixed size={17} className="ml-2" />{busy ? 'لحظة واحدة…' : 'استخدم موقعي'}</Button></div>
    {error && ready && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <p role="status" className="text-sm text-[#005931]">{value ? 'تم تحديد نقطة التوصيل. كمّل تفاصيل العنوان تحت.' : 'لسه ما اخترتش نقطة توصيل؛ القاهرة الظاهرة مجرد بداية للخريطة.'}</p>
  </section>;
}
