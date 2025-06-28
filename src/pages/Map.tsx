
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Save } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';

interface SavedLocation {
  lat: number;
  lng: number;
  address?: string;
  timestamp: string;
}

const Map = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps loaded successfully');
        initializeMap();
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps');
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "فشل في تحميل الخريطة"
        });
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      // Default to Cairo, Egypt
      const defaultLocation = { lat: 30.0444, lng: 31.2357 };
      
      const map = new google.maps.Map(mapRef.current, {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;

      // Add click listener to map
      map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          
          setSelectedLocation({ lat, lng });
          addMarker(lat, lng);
          getAddressFromCoordinates(lat, lng);
        }
      });

      // Try to get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            map.setCenter(userLocation);
            setSelectedLocation(userLocation);
            addMarker(userLocation.lat, userLocation.lng);
            getAddressFromCoordinates(userLocation.lat, userLocation.lng);
          },
          (error) => {
            console.log('Could not get user location:', error);
          }
        );
      }

      setIsLoaded(true);
    };

    loadGoogleMaps();

    return () => {
      // Cleanup
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      scripts.forEach(script => script.remove());
    };
  }, [toast]);

  const addMarker = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Add new marker
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title: 'الموقع المحدد',
      animation: google.maps.Animation.DROP,
    });

    markerRef.current = marker;
  };

  const getAddressFromCoordinates = (lat: number, lng: number) => {
    if (!window.google) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { location: { lat, lng } },
      (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const formattedAddress = results[0].formatted_address;
          setAddress(formattedAddress);
        } else {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      }
    );
  };

  const saveLocation = () => {
    if (!selectedLocation) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى تحديد موقع على الخريطة أولاً"
      });
      return;
    }

    const locationData: SavedLocation = {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: address,
      timestamp: new Date().toISOString()
    };

    // Save to localStorage
    const savedLocations = JSON.parse(localStorage.getItem('savedLocations') || '[]');
    savedLocations.push(locationData);
    localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
    
    // Also save as current location
    localStorage.setItem('currentLocation', JSON.stringify(locationData));

    toast({
      title: "تم حفظ الموقع",
      description: "تم حفظ الموقع المحدد بنجاح"
    });

    console.log('Location saved:', locationData);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <MainLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center p-4 bg-white shadow-sm z-10">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تحديد الموقع</h1>
          <div className="w-10" />
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
          
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-gray-600">جاري تحميل الخريطة...</p>
              </div>
            </div>
          )}
        </div>

        {/* Location Info and Save Button */}
        {selectedLocation && (
          <div className="bg-white p-4 shadow-lg border-t">
            <div className="flex items-start mb-3">
              <MapPin size={20} className="text-primary mt-1 ml-2" />
              <div className="flex-1">
                <p className="font-medium mb-1">الموقع المحدد:</p>
                <p className="text-sm text-gray-600 mb-2">{address}</p>
                <p className="text-xs text-gray-500">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
            
            <button
              onClick={saveLocation}
              className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
            >
              <Save size={18} className="ml-2" />
              حفظ الموقع
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Map;
