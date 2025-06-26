
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from './button';
import { MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GoogleMapProps {
  height?: string;
  width?: string;
  zoom?: number;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ 
  height = '400px', 
  width = '100%', 
  zoom = 15,
  onLocationUpdate 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      console.log('Initializing Google Maps...');
      
      const loader = new Loader({
        apiKey: 'AIzaSyBhWG1SZE7DCk9qiC4dCs82oqq3GWkVEhg',
        version: 'weekly',
        libraries: ['places']
      });

      try {
        console.log('Loading Google Maps API...');
        await loader.load();
        console.log('Google Maps API loaded successfully');
        
        // Default location (Cairo, Egypt)
        const defaultLocation = { lat: 30.0444, lng: 31.2357 };
        
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: defaultLocation,
          zoom: zoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        console.log('Map instance created');

        const markerInstance = new google.maps.Marker({
          position: defaultLocation,
          map: mapInstance,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        });

        console.log('Marker created');

        setMap(mapInstance);
        setMarker(markerInstance);
        setLoading(false);
        setError(null);

        console.log('Map initialization complete');

        // Try to get user's location automatically
        requestLocation();
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setLoading(false);
        setError('Failed to load Google Maps. Please check your internet connection.');
        toast({
          title: 'خطأ في تحميل الخريطة',
          description: 'حدث خطأ أثناء تحميل الخريطة. يرجى المحاولة مرة أخرى.',
          variant: 'destructive'
        });
      }
    };

    initMap();
  }, [zoom, toast]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      toast({
        title: 'الموقع غير مدعوم',
        description: 'متصفحك لا يدعم خدمات الموقع.',
        variant: 'destructive'
      });
      return;
    }

    console.log('Requesting location...');
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location obtained:', position.coords);
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        
        setUserLocation(newLocation);
        
        if (map && marker) {
          map.setCenter(newLocation);
          map.setZoom(zoom);
          marker.setPosition(newLocation);
        }

        // Store location in localStorage
        localStorage.setItem('userLatitude', latitude.toString());
        localStorage.setItem('userLongitude', longitude.toString());
        
        if (onLocationUpdate) {
          onLocationUpdate(latitude, longitude);
        }

        setLocationLoading(false);
        toast({
          title: 'تم تحديد الموقع',
          description: 'تم تحديد موقعك الحالي بنجاح.',
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationLoading(false);
        
        let errorMessage = 'حدث خطأ في تحديد الموقع.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'تم رفض الإذن للوصول إلى الموقع.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'معلومات الموقع غير متاحة.';
            break;
          case error.TIMEOUT:
            errorMessage = 'انتهت مهلة طلب الموقع.';
            break;
        }
        
        toast({
          title: 'خطأ في الموقع',
          description: errorMessage,
          variant: 'destructive'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  if (loading) {
    return (
      <div 
        style={{ height, width }}
        className="flex items-center justify-center bg-gray-100 rounded-lg"
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">جاري تحميل الخريطة...</p>
          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        style={{ height, width }}
        className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200"
      >
        <div className="text-center p-4">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <Button 
            onClick={() => {
              setError(null);
              setLoading(true);
              window.location.reload();
            }}
            size="sm"
            variant="outline"
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        style={{ height, width }}
        className="rounded-lg shadow-md"
      />
      <div className="absolute top-4 right-4">
        <Button
          onClick={requestLocation}
          disabled={locationLoading}
          size="sm"
          className="bg-white text-gray-700 hover:bg-gray-50 shadow-md"
          variant="outline"
        >
          {locationLoading ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <MapPin className="h-4 w-4 ml-2" />
          )}
          تحديد موقعي
        </Button>
      </div>
      {userLocation && (
        <div className="absolute bottom-4 left-4 bg-white p-2 rounded-lg shadow-md text-xs">
          <p className="font-semibold">الإحداثيات:</p>
          <p>العرض: {userLocation.lat.toFixed(6)}</p>
          <p>الطول: {userLocation.lng.toFixed(6)}</p>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
