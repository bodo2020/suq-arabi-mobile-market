
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Search, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface SelectedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface MapLocationPickerProps {
  onLocationSelect?: (location: SelectedLocation) => void;
  initialLocation?: { lat: number; lng: number };
  showBackButton?: boolean;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  showBackButton = true
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scriptError, setScriptError] = useState(false);
  
  // Default to Cairo if no initial location provided
  const defaultLat = initialLocation?.lat || 30.0444;
  const defaultLng = initialLocation?.lng || 31.2357;
  
  // Refs for Google Maps objects
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Load Google Maps script with better error handling
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already available');
        initializeMap();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script already exists, waiting for load...');
        const checkGoogleMaps = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkGoogleMaps);
            initializeMap();
          }
        }, 100);
        
        // Clear interval after 10 seconds to prevent infinite loop
        setTimeout(() => {
          clearInterval(checkGoogleMaps);
          if (!window.google || !window.google.maps) {
            console.error('Google Maps failed to load after timeout');
            setScriptError(true);
          }
        }, 10000);
        return;
      }

      // Create and load the script
      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCkV_5RhFvcX-kXdGh5IsIZzwexnvrx6Fw&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      // Create global callback
      (window as any).initMap = () => {
        console.log('Google Maps callback triggered');
        initializeMap();
      };
      
      script.onerror = (error) => {
        console.error('Error loading Google Maps script:', error);
        setScriptError(true);
        toast({
          title: "خطأ في تحميل الخريطة",
          description: "تحقق من اتصال الإنترنت وحاول مرة أخرى",
          variant: "destructive"
        });
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  // Initialize the map
  const initializeMap = () => {
    if (!mapContainerRef.current) {
      console.error('Map container not available');
      return;
    }

    if (!window.google?.maps) {
      console.error('Google Maps not available');
      setScriptError(true);
      return;
    }

    try {
      console.log("Initializing Google Maps with container:", mapContainerRef.current);
      
      const mapOptions: google.maps.MapOptions = {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy'
      };

      const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
      mapRef.current = map;
      
      // Initialize geocoder
      geocoderRef.current = new window.google.maps.Geocoder();
      
      // Create marker
      const marker = new window.google.maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map: map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: 'اسحبني لتحديد الموقع'
      });
      markerRef.current = marker;
      
      // Get initial location address
      reverseGeocode(defaultLat, defaultLng);
      
      // Add event listeners
      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        if (position) {
          reverseGeocode(position.lat(), position.lng());
        }
      });
      
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng && marker) {
          marker.setPosition(e.latLng);
          reverseGeocode(e.latLng.lat(), e.latLng.lng());
        }
      });
      
      setMapLoaded(true);
      console.log("Map initialized successfully");
      
    } catch (error) {
      console.error("Error initializing map:", error);
      setScriptError(true);
      toast({
        title: "خطأ في إنشاء الخريطة",
        description: "حدث خطأ أثناء تحميل الخريطة",
        variant: "destructive"
      });
    }
  };

  // Reverse geocode to get address
  const reverseGeocode = (lat: number, lng: number) => {
    if (!geocoderRef.current) return;

    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const addressText = results[0].formatted_address;
        const location = { lat, lng, address: addressText };
        setSelectedLocation(location);
        console.log("Location selected:", location);
      } else {
        console.error("Geocoder failed:", status);
        const location = { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
        setSelectedLocation(location);
      }
    });
  };

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim() || !geocoderRef.current || !mapRef.current || !markerRef.current) {
      return;
    }

    geocoderRef.current.geocode({ address: searchQuery }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        
        mapRef.current!.setCenter({ lat, lng });
        mapRef.current!.setZoom(16);
        markerRef.current!.setPosition({ lat, lng });
        
        reverseGeocode(lat, lng);
        
        toast({
          title: "تم العثور على الموقع",
          description: results[0].formatted_address,
        });
      } else {
        toast({
          title: "لم يتم العثور على الموقع",
          description: "يرجى المحاولة بكلمات أخرى",
          variant: "destructive"
        });
      }
    });
  };

  // Get user's current location
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
      toast({
        title: "جاري تحديد موقعك",
        description: "يرجى الانتظار...",
      });

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

    if (onLocationSelect) {
      onLocationSelect(selectedLocation);
    } else {
      // Save to localStorage and navigate back
      localStorage.setItem('selectedLat', selectedLocation.lat.toString());
      localStorage.setItem('selectedLng', selectedLocation.lng.toString());
      localStorage.setItem('selectedAddress', selectedLocation.address);
      navigate(-1);
    }
  };

  // Render error state
  if (scriptError) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col z-50">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="الرجوع"
            >
              <ArrowRight size={24} className="text-primary" />
            </button>
          )}
          <h1 className="text-lg font-bold text-primary">تحديد الموقع</h1>
          <div className="w-10"></div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">خطأ في تحميل الخريطة</h2>
            <p className="text-gray-600 mb-6">
              لم نتمكن من تحميل خدمة الخرائط. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} className="text-primary" />
          </button>
        )}
        <h1 className="text-lg font-bold text-primary">تحديد الموقع</h1>
        <div className="w-10"></div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="ابحث عن مكان"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pr-10 text-right border-2 border-primary/20 rounded-xl focus:border-primary"
            />
          </div>
          <Button
            onClick={handleSearch}
            className="bg-primary hover:bg-primary/90 text-white px-4"
            disabled={!searchQuery.trim()}
          >
            بحث
          </Button>
        </div>
      </div>
      
      {/* Map container */}
      <div className="flex-1 p-4 bg-gray-50">
        <div className="h-full w-full relative bg-white rounded-3xl overflow-hidden shadow-lg">
          <div 
            ref={mapContainerRef}
            className="h-full w-full"
            style={{ minHeight: '400px' }}
          />
          
          {!mapLoaded && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل الخريطة...</p>
                <p className="text-sm text-gray-500 mt-2">قد يستغرق هذا بضع ثوانٍ</p>
              </div>
            </div>
          )}
          
          {/* My Location Button */}
          {mapLoaded && (
            <div className="absolute bottom-4 right-4 z-10">
              <Button
                onClick={getUserLocation}
                variant="secondary"
                size="icon"
                className="bg-primary hover:bg-primary/90 text-white shadow-lg rounded-full w-12 h-12"
                aria-label="تحديد موقعي"
              >
                <Navigation size={20} />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="mt-1">
              <MapPin size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {selectedLocation.address}
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleConfirmLocation}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium"
          >
            تأكيد الموقع
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapLocationPicker;
