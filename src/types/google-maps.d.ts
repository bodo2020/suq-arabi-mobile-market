
declare global {
  interface Window {
    google: {
      maps: {
        Map: typeof google.maps.Map;
        Marker: typeof google.maps.Marker;
        Geocoder: typeof google.maps.Geocoder;
        Animation: {
          DROP: number;
          BOUNCE: number;
        };
        MapMouseEvent: any;
      };
    };
  }
}

export {};
