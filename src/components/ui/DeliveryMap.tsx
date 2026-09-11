import { useEffect, useRef, useState } from 'react';
import { Hand, LocateFixed, MapPin, Search } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import BrandLoader from './BrandLoader';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { DEFAULT_DELIVERY_CENTER } from '@/lib/deliveryAddress';

export type Coordinates = { lat: number; lng: number };

type Props = {
  value: Coordinates | null;
  onChange: (value: Coordinates) => void;
  onAddressResolved?: (address: string) => void;
  autoLocate?: boolean;
};

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 30000,
};

export default function DeliveryMap({ value, onChange, onAddressResolved, autoLocate = true }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const geocoder = useRef<any>(null);
  const selected = useRef(false);
  const callback = useRef(onChange);
  const addressCallback = useRef(onAddressResolved);
  const touchDevice = useRef(typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches).current;
  const interactionEnabledRef = useRef(!touchDevice);
  const autoLocateStarted = useRef(false);
  const alive = useRef(true);

  callback.current = onChange;
  addressCallback.current = onAddressResolved;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [mapInteractionEnabled, setMapInteractionEnabled] = useState(!touchDevice);

  interactionEnabledRef.current = mapInteractionEnabled;

  const reverseGeocode = (coordinates: Coordinates) => {
    if (!geocoder.current) return;
    geocoder.current.geocode({ location: coordinates }, (results: any[], status: string) => {
      if (!alive.current || status !== 'OK' || !results?.[0]) return;
      addressCallback.current?.(results[0].formatted_address || '');
    });
  };

  useEffect(() => {
    alive.current = true;
    const listeners: Array<{ remove: () => void }> = [];
    const failure = () => {
      if (!alive.current) return;
      setError('الخريطة غير متاحة حاليًا. حاول مرة أخرى.');
    };
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
        fullscreenControl: !touchDevice,
        clickableIcons: false,
        gestureHandling: touchDevice ? 'none' : 'cooperative',
        draggable: !touchDevice,
        scrollwheel: !touchDevice,
      });
      geocoder.current = new sdk.maps.Geocoder();

      listeners.push(map.current.addListener('dragstart', () => {
        if (touchDevice && !interactionEnabledRef.current) return;
        selected.current = true;
      }));
      listeners.push(map.current.addListener('click', (event: any) => {
        if (touchDevice && !interactionEnabledRef.current) return;
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
      if (value) reverseGeocode(value);
    }).catch(failure);

    return () => {
      alive.current = false;
      listeners.forEach(listener => listener.remove());
      map.current = null;
      if (browser.gm_authFailure === failure) browser.gm_authFailure = previous;
    };
  }, []);

  useEffect(() => {
    if (!touchDevice || !ready || !map.current) return;
    map.current.setOptions({
      gestureHandling: mapInteractionEnabled ? 'greedy' : 'none',
      draggable: mapInteractionEnabled,
      scrollwheel: mapInteractionEnabled,
    });
  }, [mapInteractionEnabled, ready, touchDevice]);

  const move = (coordinates: Coordinates) => {
    if (!alive.current || !map.current) return;
    selected.current = true;
    map.current.setCenter(coordinates);
    map.current.setZoom(18);
  };

  const enableManualSelection = () => {
    if (touchDevice) setMapInteractionEnabled(true);
    selected.current = true;
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setError('حدد مكانك يدويًا على الخريطة.');
      enableManualSelection();
      return;
    }

    setBusy(true);
    setError('');

    navigator.geolocation.getCurrentPosition(position => {
      if (!alive.current) return;
      setBusy(false);
      if (touchDevice) setMapInteractionEnabled(false);
      move({ lat: position.coords.latitude, lng: position.coords.longitude });
    }, geoError => {
      if (!alive.current) return;
      setBusy(false);
      enableManualSelection();
      setError(geoError.code === geoError.PERMISSION_DENIED
        ? 'تم رفض إذن الموقع. حدد مكانك يدويًا.'
        : 'تعذر تحديد موقعك. حدد مكانك يدويًا.');
    }, GEO_OPTIONS);
  };

  useEffect(() => {
    if (!ready || value || !autoLocate || autoLocateStarted.current) return;
    autoLocateStarted.current = true;
    locate();
  }, [autoLocate, ready, value]);

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
        setError('العنوان غير موجود. جرّب كتابة المنطقة أو الشارع بشكل أوضح.');
        return;
      }
      const point = results[0].geometry.location;
      enableManualSelection();
      move({ lat: point.lat(), lng: point.lng() });
      addressCallback.current?.(results[0].formatted_address || search.trim());
    });
  };

  return <section className="space-y-3" aria-label="تحديد موقع التوصيل">
    <div className="flex gap-2">
      <Input
        aria-label="ابحث عن شارع أو منطقة"
        placeholder="ابحث عن شارع أو منطقة"
        value={search}
        onChange={event => setSearch(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            find();
          }
        }}
        className="h-12 rounded-xl"
      />
      <Button type="button" variant="outline" onClick={find} disabled={!ready || busy || !search.trim()} className="h-12 rounded-xl" aria-label="بحث على الخريطة">
        <Search size={20} />
      </Button>
    </div>

    <div className={`delivery-map-shell relative overflow-hidden rounded-3xl border bg-slate-50 shadow-sm ${mapInteractionEnabled ? 'is-interactive' : ''}`}>
      <div ref={element} className="delivery-map-canvas" style={{ height: 390 }} aria-label="خريطة تحديد موقع التوصيل" />

      {ready && <>
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <MapPin className="-translate-y-1/2 fill-white text-[#005931] drop-shadow-lg" size={46} strokeWidth={2.3} aria-hidden="true" />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={locate}
          disabled={busy}
          className="absolute left-3 top-3 z-20 min-h-11 rounded-full bg-white/95 px-4 text-[#005931] shadow-lg backdrop-blur"
        >
          {busy ? <BrandLoader size="sm" className="ml-2" /> : <LocateFixed size={17} className="ml-2" />}
          {busy ? 'جارٍ التحديد' : 'موقعي الحالي'}
        </Button>
      </>}

      {!ready && <div className="absolute inset-0 flex items-center justify-center gap-3 p-6 text-center">
        {!error && <BrandLoader size="md" />}
        <span>{error || 'جارٍ تحميل الخريطة'}</span>
      </div>}

      {touchDevice && ready && <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
        <Button
          type="button"
          variant={mapInteractionEnabled ? 'default' : 'secondary'}
          onClick={() => setMapInteractionEnabled(current => !current)}
          className="pointer-events-auto min-h-11 rounded-full px-4 shadow-lg"
          aria-pressed={mapInteractionEnabled}
        >
          <Hand size={17} className="ml-2" />
          {mapInteractionEnabled ? 'تم' : 'حرّك الخريطة'}
        </Button>
      </div>}
    </div>

    {error && ready && <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}
  </section>;
}
