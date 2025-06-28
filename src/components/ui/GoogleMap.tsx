
import React, { useEffect, useRef, useState } from 'react';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

const GoogleMap: React.FC<GoogleMapProps> = ({
  center = { lat: 24.7136, lng: 46.6753 }, // Default to Riyadh, Saudi Arabia
  zoom = 10,
  height = '400px',
  className = '',
  onMapClick
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_KEY = 'AIzaSyAAVw59DZPSHu3MKe78lz0EvI-QXTJSCqE';

  const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log('Google Maps already loaded');
        resolve();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        console.log('Google Maps script already exists, waiting for load');
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
        return;
      }

      console.log('Loading Google Maps script');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        // Wait a bit for the API to initialize
        setTimeout(() => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            resolve();
          } else {
            reject(new Error('Google Maps API not properly initialized'));
          }
        }, 100);
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  };

  const initializeMap = async () => {
    if (!mapRef.current) {
      console.error('Map container not found');
      return;
    }

    try {
      console.log('Initializing map...');
      await loadGoogleMapsScript();

      if (!window.google || !window.google.maps || !window.google.maps.Map) {
        throw new Error('Google Maps API not available');
      }

      console.log('Creating map instance');
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: 'satellite',
        // Minimal controls to avoid widget conflicts
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy'
      });

      // Add a simple marker
      new google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        title: 'الموقع',
      });

      // Add click listener if provided
      if (onMapClick) {
        mapInstanceRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            onMapClick(event.latLng.lat(), event.latLng.lng());
          }
        });
      }

      console.log('Map initialized successfully');
      setIsLoaded(true);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('فشل في تحميل الخريطة');
    }
  };

  useEffect(() => {
    initializeMap();
  }, [center.lat, center.lng, zoom]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ height }}>
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button 
            onClick={initializeMap}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={mapRef}
        style={{ height, width: '100%' }}
        className="rounded-lg shadow-sm border"
      />
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">جاري تحميل الخريطة...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
