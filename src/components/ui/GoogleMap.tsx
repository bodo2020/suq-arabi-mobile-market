
import React, { useEffect, useRef, useState } from 'react';

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

  const loadGoogleMaps = () => {
    return new Promise<void>((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkGoogle = () => {
          if (window.google && window.google.maps) {
            resolve();
          } else {
            setTimeout(checkGoogle, 100);
          }
        };
        checkGoogle();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAAVw59DZPSHu3MKe78lz0EvI-QXTJSCqE&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script loaded');
        resolve();
      };
      
      script.onerror = () => {
        console.error('Error loading Google Maps script');
        reject(new Error('Failed to load Google Maps'));
      };
      
      document.head.appendChild(script);
    });
  };

  const initializeMap = async () => {
    if (!mapRef.current) {
      console.log('Map container not ready');
      return;
    }

    try {
      await loadGoogleMaps();
      
      console.log('Initializing Google Map');
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
      console.log('Google Map initialized successfully');
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('فشل في تحميل الخريطة');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      initializeMap();
    }, 100);

    return () => clearTimeout(timer);
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
      <div
        ref={mapRef}
        style={{ height, width: '100%' }}
        className="rounded-lg shadow-sm border bg-gray-100"
      />
      {!isLoaded && !error && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg"
          style={{ height }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
