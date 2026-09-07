import { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed, Search } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import BrandLoader from './BrandLoader';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { DEFAULT_DELIVERY_CENTER, DELIVERY_RADIUS_KM } from '@/lib/deliveryAddress';

export type Coordinates = { lat: number; lng: number };

type Props = {
  value: Coordinates | null;
  onChange: (value: Coordinates) => void;
  onAddressResolved?: (address: string) => void;
};

export default function DeliveryMap({ value, onChange, onAddressResolved }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const geocoder = useRef<any>(null);
  const selected = useRef(false);
  const callback = useRef(onChange);
  const addressCallback = useRef(onAddressResolved);
  callback.current = onChange;
  addressCallback.current = onAddressResolved;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const reverseGeocode = (coordinates: Coordinates) => {
    if (!geocoder.current || !addressCallback.current) return;
    geocoder.current.geocode({ location: coordinates }, (results: any[], status: string) => {
      if (!alive.current || status !== 'OK' || !results?.[0]) return;
      addressCallback.current?.(results[0].formatted_address || '');
    });
  };

  useEffect(() => {
    alive.current = true;
    const listeners: Array<{ remove: () => void }> = [];
    const failure = () => { if (alive.current) setError('الخريطة غير متاحة حاليًا. حاول مرة تانية بعد شوية.'); };
    const browser = window as unknown as { gm_authFailure?: () => void };
    const previous = browser.gm_authFailure;
    browser.gm_authFailure = failure;

    loadGoogleMaps().then(sdk => {
      if (!alive.current || !element.current) return;
      map.current = new sdk.maps.Map(element.current, {
        center: value || DEFAULT_DELIVERY_CENTER,
        zoom: value ? 17 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'cooperative',
      });
      geocoder.current = new sdk.maps.Geocoder();

      new sdk.maps.Circle({
        map: map.current,
        center: DEFAULT_DELIVERY_CENTER,
        radius: DELIVERY_RADIUS_KM * 1000,
        strokeColor: '#005931',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#005931',
        fillOpacity: 0.08,
        clickable: false,
      });

      new sdk.maps.Marker({
        map: map.current,
        position: DEFAULT_DELIVERY_CENTER,
        title: 'ماركت المعداوي',
        label: { text: 'م', color: '#ffffff', fontWeight: '700' },
      });

      listeners.push(map.current.addListener('dragstart', () => { selected.current = true; }));
      listeners.push(map.current.addListener('click', (event: any) => {
        if (!event.latLng) return;
        selected.current = true;
        map.current.panTo(event.latLng);
      }));
      listeners.push(map.current.addListener('idle', () => {
        if (!alive.current || !selected.current) return;
        const center = map.current.getCenter();
        if (!center) return;
        const coordinates = { lat: center.lat(), lng: center.lng() };
        callback.current(coordinates);
        reverseGeocode(coordinates);
      }));
      setReady(true);
    }).catch(failure);

    return () => {
      alive.current = false;
      listeners.forEach(listener => listener.remove());
      map.current = null;
      if (browser.gm_authFailure === failure) browser.gm_authFailure = previous;
    };
  }, []);

  const move = (coordinates: Coordinates) => {
    if (!alive.current || !map.current) return;
    selected.current = true;
    map.current.setCenter(coordinates);
    map.current.setZoom(17);
    callback.current(coordinates);
    reverseGeocode(coordinates);
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setError('جهازك لا يدعم تحديد الموقع. ابحث عن عنوانك أو حرّك الخريطة.');
      return;
    }
    setBusy(true);
    setError('');
    navigator.geolocation.getCurrentPosition(position => {
      if (!alive.current) return;
      move({ lat: position.coords.latitude, lng: position.coords.longitude });
      setBusy(false);
    }, () => {
      if (!alive.current) return;
      setBusy(false);
      setError('مفيش مشكلة — تقدر تحدد مكانك يدويًا على الخريطة من غير صلاحية الموقع.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };

  const find = () => {
    if (!search.trim() || !geocoder.current || busy) return;
    setBusy(true);
    setError('');
    geocoder.current.geocode({
      address: search.trim(),
      region: 'eg',
      bounds: map.current?.getBounds?.(),
    }, (results: any[], status: string) => {
      if (!alive.current) return;
      setBusy(false);
      if (status !== 'OK' || !results?.[0]) {
        setError('ملقيناش العنوان. جرّب اسم الشارع مع القرية أو المنطقة.');
        return;
      }
      const point = results[0].geometry.location;
      move({ lat: point.lat(), lng: point.lng() });
      addressCallback.current?.(results[0].formatted_address || search.trim());
    });
  };

  return <section className="space-y-3" aria-label="تحديد موقع التوصيل">
    <div className="flex gap-2">
      <Input aria-label="ابحث عن شارع أو منطقة" placeholder="ابحث عن شارع أو قرية أو منطقة" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); find(); } }} className="h-12 rounded-xl" />
      <Button type="button" variant="outline" onClick={find} disabled={!ready || busy || !search.trim()} className="h-12 rounded-xl" aria-label="بحث على الخريطة"><Search size={20} /></Button>
    </div>
    <div className="relative overflow-hidden rounded-2xl border bg-slate-50">
      <div ref={element} style={{ height: 360 }} aria-label="خريطة Google؛ حرّك الخريطة لتحديد موقع التوصيل" />
      {ready && <MapPin className="absolute pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-[#005931] fill-white drop-shadow-md" size={40} aria-hidden="true" />}
      {!ready && <div className="absolute inset-0 flex items-center justify-center gap-3 p-6 text-center">{!error && <BrandLoader size="md" />}<span>{error || 'بنحمّل الخريطة'}</span></div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-gray-600">الدائرة الخضراء هي نطاق التوصيل الحالي حتى {DELIVERY_RADIUS_KM} كم.</p>
      <Button type="button" variant="outline" onClick={locate} disabled={!ready || busy} className="min-h-11 rounded-xl"><LocateFixed size={17} className="ml-2" />{busy ? 'لحظة واحدة…' : 'استخدم موقعي'}</Button>
    </div>
    {error && ready && <p role="alert" className="text-sm text-amber-700">{error}</p>}
    <p role="status" className="text-sm text-[#005931]">{value ? 'تم تحديد نقطة التوصيل. حرّك الخريطة لو عايز تعدّلها.' : 'الخريطة بدأت من فرع المعداوي الأساسي. مش هنطلب صلاحية موقعك إلا لو ضغطت «استخدم موقعي».'}</p>
  </section>;
}
