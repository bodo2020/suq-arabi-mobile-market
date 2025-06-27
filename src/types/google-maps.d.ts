
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
  
  class InfoWindow {
    constructor(opts?: InfoWindowOptions);
    open(map?: Map, anchor?: Marker): void;
    close(): void;
    setContent(content: string | Element): void;
  }
  
  class Geocoder {
    geocode(request: GeocoderRequest): Promise<GeocoderResponse>;
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
  
  interface InfoWindowOptions {
    content?: string | Element;
    disableAutoPan?: boolean;
    maxWidth?: number;
    pixelOffset?: Size;
    position?: LatLng | LatLngLiteral;
    zIndex?: number;
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
  
  interface DirectionsResult {
    routes: DirectionsRoute[];
  }
  
  interface DirectionsRoute {
    legs: DirectionsLeg[];
    overview_path: LatLng[];
    overview_polyline: string;
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
    via_waypoints: LatLng[];
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
  
  interface Distance {
    text: string;
    value: number;
  }
  
  interface Duration {
    text: string;
    value: number;
  }
  
  interface DirectionsWaypoint {
    location: LatLng | LatLngLiteral | string;
    stopover?: boolean;
  }
  
  interface DirectionsRendererOptions {
    directions?: DirectionsResult;
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
    placeId?: string;
    bounds?: LatLngBounds;
    componentRestrictions?: GeocoderComponentRestrictions;
    region?: string;
  }
  
  interface GeocoderResponse {
    results: GeocoderResult[];
  }
  
  interface GeocoderResult {
    address_components: GeocoderAddressComponent[];
    formatted_address: string;
    geometry: GeocoderGeometry;
    place_id: string;
    types: string[];
  }
  
  interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }
  
  interface GeocoderGeometry {
    bounds?: LatLngBounds;
    location: LatLng;
    location_type: GeocoderLocationType;
    viewport: LatLngBounds;
  }
  
  interface GeocoderComponentRestrictions {
    administrativeArea?: string;
    country?: string;
    locality?: string;
    postalCode?: string;
    route?: string;
  }
  
  interface LatLngBounds {
    contains(latLng: LatLng): boolean;
    equals(other: LatLngBounds): boolean;
    extend(point: LatLng): LatLngBounds;
    getCenter(): LatLng;
    getNorthEast(): LatLng;
    getSouthWest(): LatLng;
    intersects(other: LatLngBounds): boolean;
    isEmpty(): boolean;
    toJSON(): LatLngBoundsLiteral;
    toString(): string;
    toUrlValue(precision?: number): string;
    union(other: LatLngBounds): LatLngBounds;
  }
  
  interface LatLngBoundsLiteral {
    east: number;
    north: number;
    south: number;
    west: number;
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
  
  type DirectionsStatus = 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_WAYPOINTS_EXCEEDED' | 'MAX_ROUTE_LENGTH_EXCEEDED' | 'INVALID_REQUEST' | 'OVER_DAILY_LIMIT' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'UNKNOWN_ERROR';
  
  type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  
  type GeocoderLocationType = 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
  
  type MapTypeId = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  
  enum Animation {
    BOUNCE = 1,
    DROP = 2,
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
