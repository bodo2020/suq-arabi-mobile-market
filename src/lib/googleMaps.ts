import { Loader } from '@googlemaps/js-api-loader';

// Client-side Maps JavaScript keys are public by design and must be protected in Google Cloud
// with HTTP referrer + API restrictions. VITE_GOOGLE_MAPS_API_KEY lets production override
// the legacy browser key without rebuilding this integration.
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw';
const loader = new Loader({
  apiKey,
  version: 'quarterly',
  language: 'ar',
  region: 'EG',
  authReferrerPolicy: 'origin',
});

export const loadGoogleMaps = () => loader.load();
