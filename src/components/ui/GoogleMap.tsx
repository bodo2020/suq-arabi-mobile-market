
import React, { useEffect, useRef, useState } from 'react';
import Script from './Script';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({
  center = { lat: 24.7136, lng: 46.6753 }, // Default to Riyadh, Saudi Arabia
  zoom = 10,
  height = '400px',
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    try {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      // Add a marker at the center
      new window.google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        title: 'الموقع',
      });

      setIsLoaded(true);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('فشل في تحميل الخريطة');
    }
  };

  const handleScriptLoad = () => {
    console.log('Google Maps script loaded successfully');
    initializeMap();
  };

  const handleScriptError = (error: Error) => {
    console.error('Error loading Google Maps script:', error);
    setError('فشل في تحميل Google Maps');
  };

  useEffect(() => {
    if (window.google && window.google.maps) {
      initializeMap();
    }
  }, [center, zoom]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ height }}>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Script
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAAVw59DZPSHu3MKe78lz0EvI-QXTJSCqE&libraries=places"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />
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
