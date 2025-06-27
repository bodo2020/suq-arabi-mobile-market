
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
        resolve();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          // Wait a bit more to ensure all APIs are loaded
          setTimeout(() => {
            if (window.google && window.google.maps && window.google.maps.Map) {
              resolve();
            } else {
              reject(new Error('Google Maps API not properly loaded'));
            }
          }, 100);
        });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      // Create a global callback function
      (window as any).initGoogleMaps = () => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          resolve();
        } else {
          reject(new Error('Google Maps API not properly initialized'));
        }
      };
      
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      
      document.head.appendChild(script);
    });
  };

  const initializeMap = async () => {
    if (!mapRef.current) return;

    try {
      // Ensure Google Maps is loaded
      await loadGoogleMapsScript();

      // Double-check that the API is available
      if (!window.google || !window.google.maps || !window.google.maps.Map) {
        throw new Error('Google Maps API not available');
      }

      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: 'satellite',
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      // Add a marker at the center
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
        <p className="text-red-500">{error}</p>
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
        <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
