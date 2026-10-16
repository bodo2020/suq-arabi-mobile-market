import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin, Minus, Plus } from 'lucide-react';
import { Button } from './button';
import { DEFAULT_DELIVERY_CENTER } from '@/lib/deliveryAddress';

export type Coordinates = { lat: number; lng: number };
type Props = { value: Coordinates | null; onChange: (value: Coordinates) => void; onAddressResolved?: (address: string) => void; autoLocate?: boolean };
// OSM public tiles are best-effort for modest interactive use, not unlimited hosting.
const configuredTiles = import.meta.env.VITE_MAP_TILE_URL?.trim();
const configuredAttribution = import.meta.env.VITE_MAP_ATTRIBUTION?.trim();
const customProvider = configuredTiles?.startsWith('https://') && configuredAttribution;
const tileUrl = customProvider ? configuredTiles : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution = customProvider ? configuredAttribution : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export default function DeliveryMap({ value, onChange, autoLocate = true }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const currentValue = useRef(value);
  currentValue.current = value;
  const initialValue = useRef(value);
  const selected = useRef(false);
  const alive = useRef(false);
  const locateRequest = useRef(0);
  const autoStarted = useRef(false);
  const autoRetriedAfterPermission = useRef(false);
  const locating = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState('');
  const [tileError, setTileError] = useState(false);

  const locate = (force = false) => {
    if (!navigator.geolocation) { setError('تحديد الموقع غير متاح. اختار المكان يدويًا.'); return; }
    const request = ++locateRequest.current;
    locating.current = true;
    setBusy(true); setError(''); setPermissionDenied(false);
    navigator.geolocation.getCurrentPosition(position => {
      if (!alive.current || request !== locateRequest.current) return;
      locating.current = false;
      setBusy(false);
      if (!force && selected.current) return;
      selected.current = true;
      const point = {lat:position.coords.latitude,lng:position.coords.longitude};
      callback.current(point);
      map.current?.setView([point.lat,point.lng],17);
    }, reason => {
      if (!alive.current || request !== locateRequest.current) return;
      locating.current = false;
      setBusy(false);
      setPermissionDenied(reason.code === reason.PERMISSION_DENIED);
      setError(reason.code === reason.PERMISSION_DENIED ? 'إذن الموقع مرفوض. تقدر تحدد المكان يدويًا.' : 'تعذر تحديد موقعك. حرّك الخريطة وحدد باب البيت.');
    }, {enableHighAccuracy:true,timeout:15000,maximumAge:30000});
  };
  useEffect(() => {
    if (!element.current) return;
    alive.current = true;
    const point = initialValue.current || DEFAULT_DELIVERY_CENTER;
    const instance = L.map(element.current, {
      center:[point.lat,point.lng],zoom:initialValue.current ? 17 : 14,
      zoomControl:false,attributionControl:true,
      dragging:true,touchZoom:true,scrollWheelZoom:true,
      doubleClickZoom:true,boxZoom:true,keyboard:true,
    });
    map.current = instance;
    instance.attributionControl.setPrefix(false);
    const tiles = L.tileLayer(tileUrl, {maxZoom:19,attribution,keepBuffer:0,updateWhenIdle:true,updateWhenZooming:false}).addTo(instance);
    tiles.on('tileerror', () => { if (alive.current) setTileError(true); });
    tiles.on('load', () => {
      const visibleTiles = element.current?.querySelectorAll<HTMLImageElement>('.leaflet-tile');
      if (alive.current && visibleTiles?.length && [...visibleTiles].every(tile => tile.complete && tile.naturalWidth > 0)) setTileError(false);
    });
    instance.on('dragstart', () => { selected.current = true; });
    instance.on('click', (event: L.LeafletMouseEvent) => {
      selected.current = true;
      instance.panTo(event.latlng);
      callback.current({lat:event.latlng.lat,lng:event.latlng.lng});
    });
    instance.on('moveend', () => {
      if (!alive.current || !selected.current) return;
      const center = instance.getCenter();
      callback.current({lat:center.lat,lng:center.lng});
    });
    const observer = new ResizeObserver(() => instance.invalidateSize({pan:false}));
    observer.observe(element.current);
    setReady(true);
    return () => {
      alive.current = false; locateRequest.current++; locating.current = false;
      observer.disconnect(); instance.remove(); map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || value || !autoLocate || autoStarted.current) return;
    autoStarted.current = true; locate();
  }, [ready,value,autoLocate]);
  useEffect(() => {
    if (!ready || !autoLocate || !navigator.permissions?.query) return;
    let active = true;
    let permission: PermissionStatus | null = null;
    const retryWhenGranted = () => {
      if (!active || permission?.state !== 'granted' || !autoStarted.current ||
          autoRetriedAfterPermission.current || locating.current || selected.current || currentValue.current) return;
      autoRetriedAfterPermission.current = true;
      locate();
    };
    void navigator.permissions.query({ name: 'geolocation' }).then(status => {
      if (!active) return;
      permission = status;
      status.addEventListener('change', retryWhenGranted);
      retryWhenGranted();
    }).catch(() => { /* The first geolocation request still works without the Permissions API. */ });
    const onReturn = () => { if (!document.hidden) retryWhenGranted(); };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      active = false;
      permission?.removeEventListener('change', retryWhenGranted);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [ready, autoLocate, permissionDenied]);
  return <section className="space-y-3" aria-label="تحديد موقع التوصيل">
    <p className="text-sm text-muted-foreground">حدد باب البيت تحت الدبوس، ثم اكتب تفاصيل العنوان بالأسفل.</p>
    <div className="delivery-map-shell is-interactive relative isolate overflow-hidden rounded-3xl border bg-slate-50 shadow-sm">
      <div ref={element} className="delivery-map-canvas" style={{height:390,zIndex:0}} aria-label="خريطة الشوارع لتحديد موقع التوصيل" />
      {ready && <>
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <MapPin className="-translate-y-1/2 fill-white text-[#005931] drop-shadow-lg" size={46} strokeWidth={2.3} aria-hidden="true" />
        </div>
        <Button type="button" variant="secondary" onClick={() => locate(true)} disabled={busy} className="absolute left-3 top-3 z-20 min-h-11 rounded-full bg-white px-4 text-[#005931] shadow-lg">
          <LocateFixed size={17} className="ml-2" />{busy ? 'جارٍ التحديد' : 'موقعي الحالي'}
        </Button>
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-1">
          <Button type="button" variant="secondary" className="h-11 w-11 bg-white shadow" aria-label="تكبير الخريطة" onClick={() => map.current?.zoomIn()}><Plus size={20}/></Button>
          <Button type="button" variant="secondary" className="h-11 w-11 bg-white shadow" aria-label="تصغير الخريطة" onClick={() => map.current?.zoomOut()}><Minus size={20}/></Button>
        </div>
      </>}
    </div>
    {(error || tileError) && <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{error || 'تعذر تحميل جزء من الخريطة. تحقق من الإنترنت وحاول فتح الصفحة مجددًا.'}</p>}
  </section>;
}
