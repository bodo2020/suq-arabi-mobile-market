import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxMapProps {
  onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void;
  initialLocation?: { lat: number; lng: number };
  accessToken: string;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ 
  onLocationSelect, 
  initialLocation = { lat: 30.0444, lng: 31.2357 },
  accessToken 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !accessToken) return;

    // Set Mapbox access token
    mapboxgl.accessToken = accessToken;

    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [initialLocation.lng, initialLocation.lat],
        zoom: 13,
        attributionControl: false
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Create draggable marker
      marker.current = new mapboxgl.Marker({
        draggable: true,
        color: '#3b82f6'
      })
        .setLngLat([initialLocation.lng, initialLocation.lat])
        .addTo(map.current);

      // Handle marker drag
      marker.current.on('dragend', () => {
        if (marker.current) {
          const lngLat = marker.current.getLngLat();
          const location = { lat: lngLat.lat, lng: lngLat.lng };
          onLocationSelect(location);
          reverseGeocode(location);
        }
      });

      // Handle map click
      map.current.on('click', (e) => {
        const location = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        if (marker.current) {
          marker.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        }
        onLocationSelect(location);
        reverseGeocode(location);
      });

      // Map loaded event
      map.current.on('load', () => {
        setIsLoaded(true);
        // Get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              
              if (map.current && marker.current) {
                map.current.setCenter([userLocation.lng, userLocation.lat]);
                marker.current.setLngLat([userLocation.lng, userLocation.lat]);
                onLocationSelect(userLocation);
                reverseGeocode(userLocation);
              }
            },
            (error) => {
              console.warn('لا يمكن الحصول على موقع المستخدم:', error);
            },
            { timeout: 8000, enableHighAccuracy: true }
          );
        }
      });

    } catch (error) {
      console.error('خطأ في إنشاء خريطة Mapbox:', error);
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [accessToken, initialLocation.lat, initialLocation.lng, onLocationSelect]);

  const reverseGeocode = async (location: { lat: number; lng: number }) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${accessToken}&language=ar`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const address = data.features[0].place_name;
          onLocationSelect({ ...location, address });
        }
      }
    } catch (error) {
      console.error('خطأ في الحصول على العنوان:', error);
    }
  };

  return (
    <div className="relative">
      <div 
        ref={mapContainer} 
        className="w-full rounded-lg border"
        style={{ 
          height: '320px',
          minHeight: '320px'
        }}
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">جاري تحميل الخريطة...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;