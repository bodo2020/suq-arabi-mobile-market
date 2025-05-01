
import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import Script from '@/components/ui/Script';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  
  // References for map objects
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // Handle Google Maps script loading
  const handleMapScriptLoad = () => {
    console.log("Google Maps script loaded");
    setMapScriptLoaded(true);
  };

  // Clean up maps resources on unmount
  useEffect(() => {
    return () => {
      // Clear all listeners
      if (listenersRef.current.length > 0) {
        listenersRef.current.forEach(listener => {
          if (listener) {
            try {
              listener.remove();
            } catch (e) {
              console.error("Error removing listener:", e);
            }
          }
        });
        listenersRef.current = [];
      }
      
      // Remove marker from map
      if (markerRef.current) {
        try {
          markerRef.current.setMap(null);
        } catch (e) {
          console.error("Error removing marker:", e);
        }
        markerRef.current = null;
      }
      
      mapRef.current = null;
    };
  }, []);

  // Initialize the map
  useEffect(() => {
    // Only proceed if the map element exists and script is loaded
    if (!mapContainerRef.current || !mapScriptLoaded || !window.google || !window.google.maps) {
      return;
    }

    try {
      console.log("Initializing Google Maps");
      
      // Map options
      const mapOptions: google.maps.MapOptions = {
        center: { lat: initialLat, lng: initialLng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      };

      // Create map
      const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
      mapRef.current = map;

      // Add marker at initial position
      const marker = new window.google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map: map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });
      markerRef.current = marker;
      
      // Set map loaded state
      setMapLoaded(true);

      // Add event listeners and store references for cleanup
      const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        const latLng = e.latLng;
        if (latLng) {
          marker.setPosition(latLng);
          reverseGeocode(latLng.lat(), latLng.lng());
        }
      });
      listenersRef.current.push(clickListener);

      const dragendListener = marker.addListener('dragend', () => {
        const position = marker.getPosition();
        if (position) {
          reverseGeocode(position.lat(), position.lng());
        }
      });
      listenersRef.current.push(dragendListener);
      
      // Get initial location address
      reverseGeocode(initialLat, initialLng);
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }, [initialLat, initialLng, mapScriptLoaded]);

  // Get user's current location
  const getUserLocation = () => {
    if (!mapRef.current || !markerRef.current || !window.google || !window.google.maps) return;

    if (navigator.geolocation) {
      // Show toast to inform user about location request
      toast({
        title: "جاري تحديد موقعك",
        description: "يرجى الانتظار...",
      });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Got user location:", position.coords);
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Update map center and marker position
          mapRef.current?.setCenter(userLocation);
          mapRef.current?.setZoom(17); // Zoom in closer to user's location
          markerRef.current?.setPosition(userLocation);
          
          // Reverse geocode to get address
          reverseGeocode(userLocation.lat, userLocation.lng);
          
          toast({
            title: "تم تحديد موقعك",
            description: "يمكنك تحريك المؤشر لضبط الموقع بدقة",
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "تعذر الوصول إلى موقعك",
            description: "يرجى السماح بالوصول إلى الموقع أو تحديده يدويًا",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast({
        title: "خدمة تحديد الموقع غير متوفرة",
        description: "يرجى تحديد موقعك يدويًا",
        variant: "destructive"
      });
    }
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!window.google || !window.google.maps) {
      console.error("Google Maps not loaded");
      return;
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const addressText = results[0].formatted_address;
          onLocationSelect(lat, lng, addressText);
        } else {
          console.error("Geocoder failed due to: " + status);
        }
      });
    } catch (error) {
      console.error("Geocoder error:", error);
    }
  };

  // Save location to database
  const saveLocationToDatabase = async () => {
    if (!markerRef.current || !user) return;

    setLoading(true);
    
    const position = markerRef.current.getPosition();
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
      <Script 
        src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyCkV_5RhFvcX-kXdGh5IsIZzwexnvrx6Fw&libraries=places&callback=Function.prototype`}
        onLoad={handleMapScriptLoad} 
      />
      
      <div 
        ref={mapContainerRef} 
        className="h-[300px] w-full rounded-lg mb-3 bg-gray-100"
      >
        {!mapLoaded && (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <MapPin size={16} className="ml-1 text-primary" />
          <span className="text-sm">حرك المؤشر لتحديد موقعك بدقة</span>
        </div>
        <Button
          onClick={getUserLocation}
          size="sm"
          variant="outline"
          className="ml-2 text-xs"
        >
          تحديد موقعي
        </Button>
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
