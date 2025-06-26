
// Type definitions for Google Maps JavaScript API
declare namespace google.maps {
  class Map {
    constructor(mapDiv: HTMLElement, options?: MapOptions);
    setCenter(latLng: LatLng | LatLngLiteral): void;
    getCenter(): LatLng;
    setZoom(zoom: number): void;
    getZoom(): number;
    addListener(eventName: string, handler: Function): MapsEventListener;
    setOptions(options: MapOptions): void;
    setMapTypeId(mapTypeId: string | MapTypeId): void;
    setStyles(styles: MapTypeStyle[]): void;
    get(key: string): any;
  }
  
  class Marker {
    constructor(opts?: MarkerOptions);
    setPosition(latLng: LatLng | LatLngLiteral): void;
    getPosition(): LatLng | null;
    setMap(map: Map | null): void;
    addListener(eventName: string, handler: Function): MapsEventListener;
    setAnimation(animation: Animation | null): void;
  }
  
  class Geocoder {
    constructor();
    geocode(request: GeocoderRequest): Promise<GeocoderResponse>;
    geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
  }

  class DirectionsService {
    constructor();
    route(request: DirectionsRequest, callback: (result: DirectionsResult | null, status: DirectionsStatus) => void): void;
  }

  class DirectionsRenderer {
    constructor(opts?: DirectionsRendererOptions);
    setMap(map: Map | null): void;
    setDirections(directions: DirectionsResult): void;
  }

  class InfoWindow {
    constructor(opts?: InfoWindowOptions);
    open(map?: Map, anchor?: Marker): void;
    close(): void;
    setContent(content: string | Element): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
    toJSON(): LatLngLiteral;
  }

  namespace geometry {
    namespace spherical {
      function computeDistanceBetween(from: LatLng, to: LatLng): number;
    }
  }
  
  interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    mapTypeId?: string | MapTypeId;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    zoomControl?: boolean;
    zoomControlOptions?: {
      position: ControlPosition;
    };
    styles?: MapTypeStyle[];
    backgroundColor?: string;
    gestureHandling?: string;
  }
  
  interface MapTypeStyle {
    elementType?: string;
    featureType?: string;
    stylers: MapTypeStyler[];
  }
  
  interface MapTypeStyler {
    [key: string]: string | number | null;
  }
  
  interface MarkerOptions {
    position?: LatLng | LatLngLiteral;
    map?: Map | null;
    title?: string;
    animation?: Animation | null;
    draggable?: boolean;
    icon?: string | Icon | Symbol;
  }
  
  interface Icon {
    url: string;
    size?: Size;
    scaledSize?: Size;
    origin?: Point;
    anchor?: Point;
  }

  interface Symbol {
    path: SymbolPath | string;
    anchor?: Point;
    fillColor?: string;
    fillOpacity?: number;
    labelOrigin?: Point;
    rotation?: number;
    scale?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
  }
  
  class Size {
    constructor(width: number, height: number);
    width: number;
    height: number;
  }
  
  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }
  
  interface GeocoderRequest {
    address?: string;
    location?: LatLng | LatLngLiteral;
  }

  interface GeocoderResponse {
    results: GeocoderResult[];
  }
  
  interface GeocoderResult {
    formatted_address: string;
    geometry: {
      location: LatLng;
    };
    types: string[];
  }

  interface DirectionsRequest {
    origin: LatLng | LatLngLiteral | string;
    destination: LatLng | LatLngLiteral | string;
    travelMode: TravelMode;
    waypoints?: DirectionsWaypoint[];
    optimizeWaypoints?: boolean;
    provideRouteAlternatives?: boolean;
    avoidFerries?: boolean;
    avoidHighways?: boolean;
    avoidTolls?: boolean;
    region?: string;
  }

  interface DirectionsWaypoint {
    location: LatLng | LatLngLiteral | string;
    stopover?: boolean;
  }

  interface DirectionsResult {
    routes: DirectionsRoute[];
  }

  interface DirectionsRoute {
    legs: DirectionsLeg[];
    overview_path: LatLng[];
    overview_polyline: DirectionsPolyline;
    summary: string;
    warnings: string[];
    waypoint_order: number[];
  }

  interface DirectionsLeg {
    distance?: Distance;
    duration?: Duration;
    end_address: string;
    end_location: LatLng;
    start_address: string;
    start_location: LatLng;
    steps: DirectionsStep[];
  }

  interface DirectionsStep {
    distance: Distance;
    duration: Duration;
    end_location: LatLng;
    instructions: string;
    path: LatLng[];
    start_location: LatLng;
    travel_mode: TravelMode;
  }

  interface DirectionsPolyline {
    points: string;
  }

  interface Distance {
    text: string;
    value: number;
  }

  interface Duration {
    text: string;
    value: number;
  }

  interface DirectionsRendererOptions {
    draggable?: boolean;
    hideRouteList?: boolean;
    infoWindow?: InfoWindow;
    map?: Map;
    markerOptions?: MarkerOptions;
    panel?: Element;
    polylineOptions?: PolylineOptions;
    preserveViewport?: boolean;
    routeIndex?: number;
    suppressBicyclingLayer?: boolean;
    suppressInfoWindows?: boolean;
    suppressMarkers?: boolean;
    suppressPolylines?: boolean;
  }

  interface PolylineOptions {
    clickable?: boolean;
    draggable?: boolean;
    editable?: boolean;
    geodesic?: boolean;
    icons?: IconSequence[];
    map?: Map;
    path?: LatLng[] | LatLngLiteral[];
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    visible?: boolean;
    zIndex?: number;
  }

  interface IconSequence {
    fixedRotation?: boolean;
    icon?: Symbol;
    offset?: string;
    repeat?: string;
  }

  interface InfoWindowOptions {
    content?: string | Element;
    disableAutoPan?: boolean;
    maxWidth?: number;
    pixelOffset?: Size;
    position?: LatLng | LatLngLiteral;
    zIndex?: number;
  }
  
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  
  interface MapMouseEvent {
    latLng?: LatLng;
  }
  
  interface MapsEventListener {
    remove(): void;
  }
  
  enum GeocoderStatus {
    OK = 'OK',
    ZERO_RESULTS = 'ZERO_RESULTS',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
  }

  enum DirectionsStatus {
    OK = 'OK',
    NOT_FOUND = 'NOT_FOUND',
    ZERO_RESULTS = 'ZERO_RESULTS',
    MAX_WAYPOINTS_EXCEEDED = 'MAX_WAYPOINTS_EXCEEDED',
    MAX_ROUTE_LENGTH_EXCEEDED = 'MAX_ROUTE_LENGTH_EXCEEDED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    OVER_DAILY_LIMIT = 'OVER_DAILY_LIMIT',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
  }
  
  type MapTypeId = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  
  enum Animation {
    BOUNCE = 1,
    DROP = 2,
  }

  enum ControlPosition {
    BOTTOM_CENTER = 11,
    BOTTOM_LEFT = 10,
    BOTTOM_RIGHT = 12,
    LEFT_BOTTOM = 6,
    LEFT_CENTER = 4,
    LEFT_TOP = 5,
    RIGHT_BOTTOM = 9,
    RIGHT_CENTER = 8,
    RIGHT_TOP = 7,
    TOP_CENTER = 2,
    TOP_LEFT = 1,
    TOP_RIGHT = 3,
  }

  enum SymbolPath {
    BACKWARD_CLOSED_ARROW = 3,
    BACKWARD_OPEN_ARROW = 4,
    CIRCLE = 0,
    FORWARD_CLOSED_ARROW = 1,
    FORWARD_OPEN_ARROW = 2,
  }

  enum TravelMode {
    BICYCLING = 'BICYCLING',
    DRIVING = 'DRIVING',
    TRANSIT = 'TRANSIT',
    WALKING = 'WALKING',
  }
}

declare global {
  interface Window {
    google: {
      maps: typeof google.maps;
    };
    scriptRegistry?: Map<string, string>;
  }
}
