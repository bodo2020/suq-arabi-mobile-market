
import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

// Import our type definitions
import '@/types/google-maps.d.ts';

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
  const { toast } = useToast();
  const { user } = useUser();

  // Initialize the map
  useEffect(() => {
    const loadMap = async () => {
      if (!mapRef.current) return;

      // Check if Google Maps is already loaded
      if (!window.google || !window.google.maps) {
        console.error('Google Maps is not loaded');
        return;
      }

      const mapOptions: google.maps.MapOptions = {
        center: { lat: initialLat, lng: initialLng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      };

      const newMap = new window.google.maps.Map(mapRef.current, mapOptions);
      setMap(newMap);

      // Add marker at initial position
      const newMarker = new window.google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map: newMap,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });
      setMarker(newMarker);

      // Add click event to the map
      newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        const latLng = e.latLng;
        if (latLng) {
          newMarker.setPosition(latLng);
          reverseGeocode(latLng.lat(), latLng.lng());
        }
      });

      // Add dragend event to the marker
      newMarker.addListener('dragend', () => {
        const position = newMarker.getPosition();
        if (position) {
          reverseGeocode(position.lat(), position.lng());
        }
      });

      // Try to get user's current location
      if (navigator.geolocation) {
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
            toast({
              title: "تعذر الوصول إلى موقعك",
              description: "يرجى السماح بالوصول إلى الموقع أو تحديده يدويًا",
              variant: "destructive"
            });
          }
        );
      }
    };

    // Load the map after Google Maps script is loaded
    const checkGoogleMapsLoaded = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(checkGoogleMapsLoaded);
        loadMap();
      }
    }, 100);

    // Clear interval on component unmount
    return () => clearInterval(checkGoogleMapsLoaded);
  }, [initialLat, initialLng, toast]);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!window.google || !window.google.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const addressText = results[0].formatted_address;
        onLocationSelect(lat, lng, addressText);
      }
    });
  };

  // Save location to database
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
      >
        {(!window.google || !window.google.maps) && (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="bg-gray-400 rounded-full p-3 mb-2">
              <MapPin size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">تحميل الخريطة...</h3>
            <p className="text-gray-500 text-sm">
              إذا استمرت المشكلة، تحقق من اتصال الإنترنت الخاص بك
            </p>
          </div>
        )}
      </div>
      
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
