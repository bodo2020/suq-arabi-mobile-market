
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Script from '@/components/ui/Script';
import '@/types/google-maps.d.ts';

const FullMapView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  
  const queryParams = new URLSearchParams(location.search);
  const initialLat = parseFloat(queryParams.get('lat') || '30.0444');
  const initialLng = parseFloat(queryParams.get('lng') || '31.2357');
  const addressId = queryParams.get('addressId');

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      try {
        if (!window.google || !window.google.maps) {
          console.log("Google Maps not loaded yet, waiting...");
          return false;
        }

        console.log("Initializing Google Maps");
        
        const mapOptions: google.maps.MapOptions = {
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
        
        setMapLoaded(true);

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
        
        return true;
      } catch (error) {
        console.error("Error initializing map:", error);
        return false;
      }
    };

    const checkGoogleMapsLoaded = setInterval(() => {
      if (initMap()) {
        clearInterval(checkGoogleMapsLoaded);
        getUserLocation();
      }
    }, 500);

    return () => clearInterval(checkGoogleMapsLoaded);
  }, [initialLat, initialLng]);

  // Get user's current location
  const getUserLocation = () => {
    if (!map || !marker || !window.google) return;

    if (navigator.geolocation) {
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
          
          map.setCenter(userLocation);
          map.setZoom(17);
          marker.setPosition(userLocation);
          
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

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const addressText = results[0].formatted_address;
        setSelectedLocation({ lat, lng, address: addressText });
      } else {
        console.error("Geocoder failed due to: " + status);
      }
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleConfirmLocation = () => {
    if (!selectedLocation) {
      toast({
        title: "تنبيه",
        description: "يرجى تحديد موقع أولاً",
        variant: "destructive"
      });
      return;
    }

    // Navigate back with selected location
    navigate(`/edit-address/${addressId || ''}?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&address=${encodeURIComponent(selectedLocation.address)}`);
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      <Script 
        src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyCkV_5RhFvcX-kXdGh5IsIZzwexnvrx6Fw&libraries=places`}
        onLoad={() => console.log("Google Maps script loaded")} 
      />
      
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <button
          onClick={handleBack}
          className="p-2"
          aria-label="الرجوع"
        >
          <ArrowRight size={24} />
        </button>
        <h1 className="text-lg font-bold">تحديد الموقع</h1>
        <div className="w-10"></div>
      </div>
      
      {/* Map takes up most of the screen */}
      <div 
        ref={mapRef} 
        className="flex-1 w-full"
      ></div>
      
      {/* Footer */}
      <div className="p-4 bg-white border-t">
        {selectedLocation && (
          <div className="mb-4 text-sm text-gray-600">{selectedLocation.address}</div>
        )}
        
        <div className="flex space-x-3 space-x-reverse">
          <Button
            onClick={getUserLocation}
            variant="outline"
            className="flex-1"
          >
            <MapPin size={16} className="ml-2" />
            تحديد موقعي
          </Button>
          
          <Button
            onClick={handleConfirmLocation}
            className="flex-1"
          >
            <Check size={16} className="ml-2" />
            تأكيد الموقع
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FullMapView;
