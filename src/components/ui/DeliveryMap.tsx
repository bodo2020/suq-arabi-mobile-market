import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Hand, LocateFixed, MapPin, Search } from 'lucide-react';
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

type LocationStatus = 'idle' | 'requesting' | 'located' | 'denied' | 'unavailable' | 'timeout' | 'error';

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
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState('');

  interactionEnabledRef.current = mapInteractionEnabled;

  const reverseGeocode = (coordinates: Coordinates) => {
    if (!geocoder.current) return;
    geocoder.current.geocode({ location: coordinates }, (results: any[], status: string) => {
      if (!alive.current || status !== 'OK' || !results?.[0]) return;
      const nextAddress = results[0].formatted_address || '';
      setResolvedAddress(nextAddress);
      addressCallback.current?.(nextAddress);
    });
  };

  useEffect(() => {
    alive.current = true;
    const listeners: Array<{ remove: () => void }> = [];
    const failure = () => {
      if (!alive.current) return;
      setError('الخريطة غير متاحة حاليًا. جرّب مرة تانية بعد شوية.');
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
        setLocationStatus(current => current === 'requesting' ? current : 'idle');
      }));
      listeners.push(map.current.addListener('click', (event: any) => {
        if (touchDevice && !interactionEnabledRef.current) return;
        if (!event.latLng) return;
        selected.current = true;
        setLocationStatus('idle');
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

  const locate = (automatic = false) => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      setError('جهازك لا يدعم تحديد الموقع. حرّك الخريطة أو ابحث عن عنوانك يدويًا.');
      enableManualSelection();
      return;
    }

    setBusy(true);
    setLocationStatus('requesting');
    setError('');

    navigator.geolocation.getCurrentPosition(position => {
      if (!alive.current) return;
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setAccuracy(Math.round(position.coords.accuracy || 0));
      setLocationStatus('located');
      setBusy(false);
      if (touchDevice) setMapInteractionEnabled(false);
      move(next);
    }, geoError => {
      if (!alive.current) return;
      setBusy(false);
      enableManualSelection();

      if (geoError.code === geoError.PERMISSION_DENIED) {
        setLocationStatus('denied');
        setError('تم رفض صلاحية الموقع. حرّك الخريطة بنفسك وضع العلامة على باب البيت، أو فعّل الموقع من إعدادات الجهاز وجرب «موقعي الحالي».');
        return;
      }
      if (geoError.code === geoError.TIMEOUT) {
        setLocationStatus('timeout');
        setError('تحديد موقعك أخد وقت أطول من المتوقع. تقدر تحرك الخريطة يدويًا أو تجرب «موقعي الحالي» مرة تانية.');
        return;
      }
      setLocationStatus('error');
      setError(automatic
        ? 'ماقدرناش نحدد موقعك تلقائيًا. حرّك الخريطة بنفسك وحدد باب البيت.'
        : 'ماقدرناش نحدد موقعك دلوقتي. حرّك الخريطة أو جرّب تاني.');
    }, GEO_OPTIONS);
  };

  useEffect(() => {
    if (!ready || value || !autoLocate || autoLocateStarted.current) return;
    autoLocateStarted.current = true;
    locate(true);
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
        setError('ملقيناش العنوان. جرّب اسم الشارع مع القرية أو المنطقة.');
        return;
      }
      const point = results[0].geometry.location;
      setLocationStatus('idle');
      setAccuracy(null);
      enableManualSelection();
      move({ lat: point.lat(), lng: point.lng() });
      const nextAddress = results[0].formatted_address || search.trim();
      setResolvedAddress(nextAddress);
      addressCallback.current?.(nextAddress);
    });
  };

  const statusText = locationStatus === 'requesting'
    ? 'بنحدد موقعك الحالي… وافق على إذن الموقع لو ظهر لك.'
    : locationStatus === 'located'
      ? `لقينا موقعك${accuracy ? ` بدقة تقريبية ±${accuracy} متر` : ''}. حرّك الخريطة لو محتاج تزبط باب البيت.`
      : locationStatus === 'denied'
        ? 'وضع الاختيار اليدوي شغال — حرّك الخريطة وحط العلامة على مكانك.'
        : value
          ? 'تم تحديد نقطة التوصيل. تقدر تزبطها بتحريك الخريطة.'
          : 'هنطلب موقعك تلقائيًا. لو رفضت الإذن تقدر تحدده يدويًا.';

  return <section className="space-y-3" aria-label="تحديد موقع التوصيل">
    <div className="rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3 text-sm">
      <div className="flex items-start gap-2 text-gray-700">
        {locationStatus === 'located' || value
          ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#005931]" />
          : <LocateFixed size={18} className="mt-0.5 shrink-0 text-[#005931]" />}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#005931]">{locationStatus === 'requesting' ? 'جارٍ الوصول لموقعك' : locationStatus === 'denied' ? 'حدد مكانك يدويًا' : 'موقع التوصيل'}</p>
          <p className="mt-0.5 leading-6">{statusText}</p>
        </div>
      </div>
    </div>

    <div className="flex gap-2">
      <Input aria-label="ابحث عن شارع أو منطقة" placeholder="ابحث عن شارع أو قرية أو منطقة" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); find(); } }} className="h-12 rounded-xl" />
      <Button type="button" variant="outline" onClick={find} disabled={!ready || busy || !search.trim()} className="h-12 rounded-xl" aria-label="بحث على الخريطة"><Search size={20} /></Button>
    </div>

    <div className={`delivery-map-shell relative overflow-hidden rounded-3xl border bg-slate-50 shadow-sm ${mapInteractionEnabled ? 'is-interactive' : ''}`}>
      <div ref={element} className="delivery-map-canvas" style={{ height: 410 }} aria-label="خريطة Google؛ حرّك الخريطة لتحديد موقع التوصيل" />

      {ready && <>
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#005931]/25" />
          <MapPin className="-translate-y-1/2 fill-white text-[#005931] drop-shadow-lg" size={46} strokeWidth={2.3} aria-hidden="true" />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => locate(false)}
          disabled={busy}
          className="absolute left-3 top-3 z-20 min-h-11 rounded-full bg-white/95 px-4 text-[#005931] shadow-lg backdrop-blur"
        >
          {busy ? <BrandLoader size="sm" className="ml-2" /> : <LocateFixed size={17} className="ml-2" />}
          {busy ? 'بنحدد موقعك' : 'موقعي الحالي'}
        </Button>
      </>}

      {!ready && <div className="absolute inset-0 flex items-center justify-center gap-3 p-6 text-center">{!error && <BrandLoader size="md" />}<span>{error || 'بنحمّل الخريطة'}</span></div>}

      {touchDevice && ready && <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
        <Button
          type="button"
          variant={mapInteractionEnabled ? 'default' : 'secondary'}
          onClick={() => setMapInteractionEnabled(current => !current)}
          className="pointer-events-auto min-h-11 rounded-full px-4 shadow-lg"
          aria-pressed={mapInteractionEnabled}
        >
          <Hand size={17} className="ml-2" />
          {mapInteractionEnabled ? 'تم اختيار المكان' : 'حرّك الخريطة'}
        </Button>
      </div>}
    </div>

    {resolvedAddress && <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm leading-6 text-gray-700 shadow-sm">
      <span className="font-bold text-[#005931]">العنوان الأقرب: </span>{resolvedAddress}
    </div>}

    {touchDevice && ready && <p className="text-xs leading-6 text-gray-500">لو الخريطة مقفولة عشان السكرول، اضغط «حرّك الخريطة». بعد ما تحط العلامة على باب البيت اضغط «تم اختيار المكان».</p>}

    {error && ready && <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">{error}</p>}
    <p className="text-xs leading-6 text-gray-500">بعد اختيار النقطة بنحسب مسافة القيادة الفعلية من الفرع؛ نطاق التوصيل الحالي حتى 10 كم بالطريق.</p>
  </section>;
}
