import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hand, LocateFixed, MapPinOff, Minus, Plus, RotateCw, ShieldAlert } from 'lucide-react';
import { DEFAULT_DELIVERY_CENTER } from '@/lib/deliveryAddress';
import { getDeviceLocation, isNativeApp, LocationError, type LocationFailure } from '@/lib/deviceLocation';
import './delivery-map.css';

export type Coordinates = { lat: number; lng: number };
type Props = { value: Coordinates | null; onChange: (value: Coordinates) => void; onAddressResolved?: (address: string) => void; autoLocate?: boolean };
// OSM public tiles are best-effort for modest interactive use, not unlimited hosting.
const configuredTiles = import.meta.env.VITE_MAP_TILE_URL?.trim();
const configuredAttribution = import.meta.env.VITE_MAP_ATTRIBUTION?.trim();
const customProvider = configuredTiles?.startsWith('https://') && configuredAttribution;
const tileUrl = customProvider ? configuredTiles : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution = customProvider ? configuredAttribution : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

const meIcon = L.divIcon({ className: 'dm-me', html: '<span class="dm-me__pulse"></span><span class="dm-me__dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });

const PROMPTS: Record<Exclude<LocationFailure, 'error'>, { icon: typeof MapPinOff; title: string; text: string; action: string }> = {
  off: {
    icon: MapPinOff,
    title: 'الموقع مقفول في موبايلك',
    text: 'شغّل الموقع (GPS) عشان نحدد بيتك بالظبط ونوصلك أسرع.',
    action: 'شغّل الموقع',
  },
  denied: {
    icon: ShieldAlert,
    title: 'محتاجين إذن الموقع',
    text: isNativeApp()
      ? 'اسمح لسوبر ماركو يعرف موقعك. لو كنت اخترت «عدم السماح» قبل كده، افتحه من: الإعدادات ← التطبيقات ← سوبر ماركو ← الأذونات ← الموقع.'
      : 'اسمح للموقع يعرف مكانك من علامة القفل جنب العنوان في المتصفح، وبعدين دوس «اسمح بالموقع».',
    action: 'اسمح بالموقع',
  },
  timeout: {
    icon: RotateCw,
    title: 'مش لاقيين موقعك',
    text: 'الإشارة ضعيفة شوية. جرّب تاني، أو حرّك الخريطة وحدّد بيتك بإيدك.',
    action: 'حاول تاني',
  },
  unsupported: {
    icon: MapPinOff,
    title: 'تحديد الموقع مش متاح هنا',
    text: 'حرّك الخريطة لحد ما الدبوس ييجي على باب البيت.',
    action: '',
  },
};

export default function DeliveryMap({ value, onChange, autoLocate = true }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const me = useRef<L.Marker | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const initialValue = useRef(value);
  const selected = useRef(false);
  const alive = useRef(false);
  const locateRequest = useRef(0);
  const autoStarted = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const [touched, setTouched] = useState(Boolean(value));
  const [failure, setFailure] = useState<LocationFailure | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [tileError, setTileError] = useState(false);

  const locate = async () => {
    const request = ++locateRequest.current;
    setBusy(true); setFailure(null); setDismissed(false);
    try {
      const point = await getDeviceLocation();
      if (!alive.current || request !== locateRequest.current) return;
      selected.current = true;
      setTouched(true);
      setAccuracy(point.accuracy);
      callback.current({ lat: point.lat, lng: point.lng });
      const instance = map.current;
      if (instance) {
        if (me.current) me.current.setLatLng([point.lat, point.lng]);
        else me.current = L.marker([point.lat, point.lng], { icon: meIcon, interactive: false, keyboard: false }).addTo(instance);
        instance.flyTo([point.lat, point.lng], 17, { duration: 0.8 });
      }
    } catch (error) {
      if (!alive.current || request !== locateRequest.current) return;
      setFailure(error instanceof LocationError ? error.kind : 'error');
    } finally {
      if (alive.current && request === locateRequest.current) setBusy(false);
    }
  };

  useEffect(() => {
    if (!element.current) return;
    alive.current = true;
    const point = initialValue.current || DEFAULT_DELIVERY_CENTER;
    const instance = L.map(element.current, {
      center: [point.lat, point.lng], zoom: initialValue.current ? 17 : 14,
      zoomControl: false, attributionControl: true,
      dragging: true, touchZoom: true, scrollWheelZoom: true,
      doubleClickZoom: true, boxZoom: true, keyboard: true,
    });
    map.current = instance;
    instance.attributionControl.setPrefix(false);
    const tiles = L.tileLayer(tileUrl, { maxZoom: 19, attribution, keepBuffer: 2, updateWhenIdle: false, updateWhenZooming: false }).addTo(instance);
    tiles.on('tileerror', () => { if (alive.current) setTileError(true); });
    tiles.on('load', () => {
      const visibleTiles = element.current?.querySelectorAll<HTMLImageElement>('.leaflet-tile');
      if (alive.current && visibleTiles?.length && [...visibleTiles].every(tile => tile.complete && tile.naturalWidth > 0)) setTileError(false);
    });
    instance.on('dragstart', () => { selected.current = true; setTouched(true); setMoving(true); });
    instance.on('zoomstart', () => { if (selected.current) setMoving(true); });
    instance.on('click', (event: L.LeafletMouseEvent) => {
      selected.current = true;
      setTouched(true);
      instance.panTo(event.latlng);
      callback.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    instance.on('moveend', () => {
      if (!alive.current) return;
      setMoving(false);
      if (!selected.current) return;
      const center = instance.getCenter();
      callback.current({ lat: center.lat, lng: center.lng });
    });
    const observer = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
    observer.observe(element.current);
    setReady(true);
    return () => {
      alive.current = false; locateRequest.current++;
      observer.disconnect(); instance.remove(); map.current = null; me.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || value || !autoLocate || autoStarted.current) return;
    autoStarted.current = true;
    void locate();
  }, [ready, value, autoLocate]);

  const prompt = failure && failure !== 'error' && !dismissed ? PROMPTS[failure] : null;
  const PromptIcon = prompt?.icon;

  return <section className="space-y-3" aria-label="تحديد موقع التوصيل">
    <div className={`delivery-map-shell dm-shell is-interactive relative isolate overflow-hidden ${moving ? 'is-moving' : ''}`}>
      <div ref={element} className="delivery-map-canvas dm-canvas" aria-label="خريطة الشوارع لتحديد موقع التوصيل" />
      {ready && <>
        <p className={`dm-hint ${moving ? 'is-hidden' : ''}`} aria-live="polite">
          <Hand size={15} aria-hidden="true" />
          {busy ? 'بندوّر على موقعك…' : touched ? 'تمام؟ كمّل التفاصيل تحت' : 'حط الدبوس على باب البيت'}
        </p>

        <div className="dm-pin" aria-hidden="true">
          <svg className="dm-pin__icon" viewBox="0 0 48 60" fill="none">
            <path d="M24 2C12.4 2 3 11.2 3 22.6 3 37.4 20.2 54.6 22.4 56.7a2.3 2.3 0 0 0 3.2 0C27.8 54.6 45 37.4 45 22.6 45 11.2 35.6 2 24 2Z" fill="#005931" stroke="#fff" strokeWidth="3" />
            <circle cx="24" cy="22.5" r="8.5" fill="#FFC120" />
          </svg>
          <span className="dm-pin__shadow" />
        </div>

        <div className="dm-zoom">
          <button type="button" aria-label="تكبير الخريطة" onClick={() => map.current?.zoomIn()}><Plus size={20} /></button>
          <span />
          <button type="button" aria-label="تصغير الخريطة" onClick={() => map.current?.zoomOut()}><Minus size={20} /></button>
        </div>

        <button type="button" onClick={() => void locate()} disabled={busy} className={`dm-locate ${busy ? 'is-busy' : ''}`} aria-label="موقعي الحالي">
          <LocateFixed size={22} />
          <span>{busy ? 'بنحدد…' : 'موقعي'}</span>
        </button>

        {prompt && PromptIcon && (
          <div className="dm-sheet" role="alertdialog" aria-labelledby="dm-sheet-title">
            <span className="dm-sheet__icon"><PromptIcon size={24} /></span>
            <div className="min-w-0 flex-1">
              <p id="dm-sheet-title" className="dm-sheet__title">{prompt.title}</p>
              <p className="dm-sheet__text">{prompt.text}</p>
              <div className="dm-sheet__actions">
                {prompt.action && <button type="button" className="dm-sheet__primary" onClick={() => void locate()}>{prompt.action}</button>}
                <button type="button" className="dm-sheet__secondary" onClick={() => setDismissed(true)}>هحدد بإيدي</button>
              </div>
            </div>
          </div>
        )}
      </>}
    </div>
    {accuracy != null && accuracy > 80 && !moving && (
      <p className="dm-note">دقة الموقع حوالي {Math.round(accuracy).toLocaleString('ar-EG')} متر، اتأكد إن الدبوس على باب البيت بالظبط.</p>
    )}
    {failure === 'error' && <p role="alert" className="dm-note dm-note--warn">تعذر تحديد موقعك. حرّك الخريطة وحدد باب البيت.</p>}
    {tileError && <p role="alert" className="dm-note dm-note--warn">تعذر تحميل جزء من الخريطة. اتأكد من الإنترنت وحاول تاني.</p>}
  </section>;
}
