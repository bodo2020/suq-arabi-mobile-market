
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Navigation, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SelectedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface SimpleMapPickerProps {
  onLocationSelect?: (location: SelectedLocation) => void;
  initialLocation?: { lat: number; lng: number };
  showBackButton?: boolean;
}

const SimpleMapPicker: React.FC<SimpleMapPickerProps> = ({
  onLocationSelect,
  initialLocation,
  showBackButton = true
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Default to provided location or Alexandria, Egypt
  const defaultLat = initialLocation?.lat || 31.2566;
  const defaultLng = initialLocation?.lng || 31.1671;
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        setScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      const API_KEY = 'AIzaSyCXShIlIaYEMOMSpbvL8xHArXK0QVw4xSE';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      // Create global callback
      (window as any).initMap = () => {
        console.log('Google Maps loaded successfully');
        setScriptLoaded(true);
      };
      
      script.onerror = () => {
        console.error('Error loading Google Maps');
        setScriptError(true);
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  // Initialize map when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !mapContainerRef.current || mapRef.current) {
      return;
    }

    try {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          }
        ]
      });
      
      mapRef.current = map;
      geocoderRef.current = new window.google.maps.Geocoder();
      
      const marker = new window.google.maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map: map,
        draggable: true,
        title: 'اسحب لتحديد الموقع'
      });
      
      markerRef.current = marker;
      
      // Get initial address
      reverseGeocode(defaultLat, defaultLng);
      
      // Add click listener to map
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng && marker) {
          marker.setPosition(e.latLng);
          reverseGeocode(e.latLng.lat(), e.latLng.lng());
        }
      });
      
      // Add dragend listener to marker
      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        if (position) {
          reverseGeocode(position.lat(), position.lng());
        }
      });
      
      setIsLoading(false);
      
    } catch (error) {
      console.error("Error initializing map:", error);
      setScriptError(true);
      setIsLoading(false);
    }
  }, [scriptLoaded, defaultLat, defaultLng]);

  const reverseGeocode = (lat: number, lng: number) => {
    if (!geocoderRef.current) {
      const location = { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
      setSelectedLocation(location);
      return;
    }

    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = { lat, lng, address: results[0].formatted_address };
        setSelectedLocation(location);
      } else {
        const location = { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
        setSelectedLocation(location);
      }
    });
  };

  const getUserLocation = () => {
    if (!mapRef.current || !markerRef.current) {
      toast({
        title: "خطأ",
        description: "الخريطة غير جاهزة بعد",
        variant: "destructive"
      });
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          if (mapRef.current && markerRef.current) {
            mapRef.current.setCenter(userLocation);
            mapRef.current.setZoom(16);
            markerRef.current.setPosition(userLocation);
            reverseGeocode(userLocation.lat, userLocation.lng);
          }
          
          toast({
            title: "تم تحديد موقعك",
            description: "يمكنك تحريك المؤشر لضبط الموقع بدقة"
          });
        },
        (error) => {
          toast({
            title: "تعذر الوصول إلى موقعك",
            description: "يرجى تحديد الموقع يدوياً على الخريطة",
            variant: "destructive"
          });
        }
      );
    }
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

    if (onLocationSelect) {
      onLocationSelect(selectedLocation);
    } else {
      // Save to localStorage for guests
      localStorage.setItem('guestLocation', JSON.stringify({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: selectedLocation.address,
        timestamp: new Date().toISOString()
      }));
      
      toast({
        title: "تم حفظ الموقع",
        description: "سيتم حفظ موقعك نهائياً عند التسجيل"
      });
      
      navigate(-1);
    }
  };

  if (scriptError) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col z-50">
        <div className="p-4 border-b flex items-center">
          {showBackButton && (
            <button onClick={() => navigate(-1)} className="p-2">
              <ArrowRight size={24} />
            </button>
          )}
          <h1 className="text-lg font-bold flex-1 text-center">تحديد الموقع</h1>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">خطأ في تحميل الخريطة</h2>
            <p className="text-gray-600 mb-4">
              لم نتمكن من تحميل الخريطة. يرجى المحاولة مرة أخرى.
            </p>
            <Button onClick={() => window.location.reload()}>
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      <div className="p-4 border-b flex items-center bg-white shadow-sm">
        {showBackButton && (
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowRight size={24} />
          </button>
        )}
        <h1 className="text-lg font-bold flex-1 text-center">تحديد الموقع</h1>
      </div>
      
      <div className="flex-1 relative">
        <div 
          ref={mapContainerRef}
          className="h-full w-full"
        />
        
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل الخريطة...</p>
            </div>
          </div>
        )}
        
        {!isLoading && (
          <div className="absolute bottom-4 right-4">
            <Button
              onClick={getUserLocation}
              size="icon"
              className="bg-white hover:bg-gray-50 text-primary shadow-lg rounded-full w-12 h-12"
            >
              <Navigation size={20} />
            </Button>
          </div>
        )}
      </div>
      
      {selectedLocation && (
        <div className="p-4 bg-white border-t">
          <div className="flex items-start gap-3 mb-4">
            <MapPin size={20} className="text-primary mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
              <p className="text-sm text-gray-600">
                {selectedLocation.address}
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleConfirmLocation}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            <Check size={18} className="ml-2" />
            تأكيد الموقع
          </Button>
        </div>
      )}
    </div>
  );
};

export default SimpleMapPicker;
