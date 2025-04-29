
/// <reference types="google.maps" />

// Define explicit types for Google Maps
declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement, options?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      getCenter(): LatLng;
      setZoom(zoom: number): void;
      getZoom(): number;
      addListener(eventName: string, handler: Function): MapsEventListener;
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
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
    }
    
    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: string | MapTypeId;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
    }
    
    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map | null;
      title?: string;
      animation?: Animation | null;
      draggable?: boolean;
    }
    
    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
    }
    
    interface GeocoderResult {
      formatted_address: string;
      geometry: {
        location: LatLng;
      };
      types: string[];
    }
    
    interface LatLng {
      lat(): number;
      lng(): number;
      toJSON(): LatLngLiteral;
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
    
    type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
    
    type MapTypeId = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
    
    enum Animation {
      BOUNCE = 1,
      DROP = 2,
    }
  }
}

// Declare the global google namespace for window
declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
