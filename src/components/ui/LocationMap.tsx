import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import '@/types/google-maps'; // Fix the import path

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number, addressText: string) => void;
  initialLat?: number;
  initialLng?: number;
  addressId?: string;
}

const LocationMap: React.FC<LocationMapProps> = ({ 
  onLocationSelect, 
  initialLat = 30.0444, 
  initialLng = 31.2357,
  addressId 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const { toast } = useToast();
  const { user } = useUser();

  // Check location permission status
  useEffect(() => {
    const checkPermission = async () => {
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
        } catch (error) {
          console.error('Error checking location permission:', error);
          setLocationPermission('unknown');
        }
      }
    };
    
    checkPermission();
  }, []);

  // Request location access
  const requestLocationAccess = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationPermission('granted');
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          if (map && marker) {
            map.setCenter(userLocation);
            marker.setPosition(userLocation);
            reverseGeocode(userLocation.lat, userLocation.lng);
          }
          
          toast({
            title: "تم الوصول إلى موقعك",
            description: "تم تحديد موقعك بنجاح"
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationPermission('denied');
          toast({
            variant: "destructive",
            title: "تعذر الوصول إلى موقعك",
            description: "يرجى السماح بالوصول إلى الموقع من إعدادات المتصفح"
          });
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "متصفحك لا يدعم خدمة تحديد المواقع"
      });
    }
  };

  useEffect(() => {
    const loadMap = async () => {
      if (!mapRef.current) return;

      if (!window.google?.maps) {
        console.error('Google Maps is not loaded');
        return;
      }

      const mapOptions = {
        center: { lat: initialLat, lng: initialLng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      };

      const newMap = new window.google.maps.Map(mapRef.current, mapOptions);
      setMap(newMap);

      const newMarker = new window.google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map: newMap,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });
      setMarker(newMarker);

      newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        const latLng = e.latLng;
        if (latLng) {
          newMarker.setPosition(latLng);
          reverseGeocode(latLng.lat(), latLng.lng());
        }
      });

      newMarker.addListener('dragend', () => {
        const position = newMarker.getPosition();
        if (position) {
          reverseGeocode(position.lat(), position.lng());
        }
      });

      // Only try to get location if permission is granted
      if (locationPermission === 'granted' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            newMap.setCenter(userLocation);
            newMarker.setPosition(userLocation);
            reverseGeocode(userLocation.lat, userLocation.lng);
          },
          () => {
            // If we can't get location despite permission being granted, don't show error
            console.log('Could not get location despite permission being granted');
          }
        );
      }
    };

    const checkGoogleMapsLoaded = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(checkGoogleMapsLoaded);
        loadMap();
      }
    }, 100);

    return () => clearInterval(checkGoogleMapsLoaded);
  }, [initialLat, initialLng, locationPermission]);

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!window.google?.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const addressText = results[0].formatted_address;
        onLocationSelect(lat, lng, addressText);
      }
    });
  };

  const saveLocationToDatabase = async () => {
    if (!marker || !user) return;

    setLoading(true);
    
    const position = marker.getPosition();
    if (!position) {
      setLoading(false);
      return;
    }

    const latitude = position.lat();
    const longitude = position.lng();

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('https://qzvpayjaadbmpayeglon.functions.supabase.co/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({ 
          latitude, 
          longitude,
          addressId
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update location');
      }
      
      toast({
        title: "تم حفظ الموقع",
        description: "تم تحديث موقعك بنجاح"
      });
      
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الموقع"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div 
        ref={mapRef} 
        className="h-[300px] w-full rounded-lg mb-3 bg-gray-100"
      ></div>
      
      {locationPermission !== 'granted' && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-md p-3 mb-3">
          <div className="flex items-center">
            <MapPin size={16} className="ml-2 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">للحصول على أفضل تجربة، يرجى السماح بالوصول إلى موقعك</span>
          </div>
          <Button 
            onClick={requestLocationAccess} 
            variant="outline" 
            size="sm" 
            className="mt-2 w-full text-xs bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800"
          >
            السماح بالوصول إلى موقعي
          </Button>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <MapPin size={16} className="ml-1 text-primary" />
          <span className="text-sm">حرك المؤشر لتحديد موقعك بدقة</span>
        </div>
        <Button
          onClick={saveLocationToDatabase}
          disabled={loading}
          size="sm"
          className="text-xs"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            'حفظ الموقع'
          )}
        </Button>
      </div>
    </div>
  );
};

export default LocationMap;
