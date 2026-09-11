import { Loader } from '@googlemaps/js-api-loader';

// Use the same browser Maps key as the working branch-control map. Client-side Maps
// JavaScript keys are public by design and should be protected in Google Cloud with
// HTTP referrer + API restrictions. Production may still override it via Vite env.
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCzjmLl8KWNlZqXcfefOPsCYRmVLJWLxoE';
const loader = new Loader({
  apiKey,
  version: 'quarterly',
  language: 'ar',
  region: 'EG',
  authReferrerPolicy: 'origin',
});

export const loadGoogleMaps = () => loader.load();
