import { Loader } from '@googlemaps/js-api-loader';

// Browser key retained from the existing map integration; restrict it by HTTP referrer.
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw';
const loader = new Loader({ apiKey, version: 'quarterly', language: 'ar', region: 'EG' });
export const loadGoogleMaps = () => loader.load();
