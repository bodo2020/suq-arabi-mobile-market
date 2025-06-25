import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Search, Navigation, Camera } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  
  // Default to Cairo if no initial location provided
  const defaultLat = initialLocation?.lat || 30.0444;
  const defaultLng = initialLocation?.lng || 31.2357;
  
  // Refs for Google Maps objects
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // Clean up function
  const cleanup = () => {
    console.log('Cleaning up map resources');
    
    if (listenersRef.current.length > 0) {
      listenersRef.current.forEach(listener => {
        try {
          listener.remove();
        } catch (e) {
          console.error('Error removing listener:', e);
        }
      });
      listenersRef.current = [];
    }
    
    if (markerRef.current) {
      try {
        markerRef.current.setMap(null);
        markerRef.current = null;
      } catch (e) {
        console.error('Error removing marker:', e);
      }
    }
    
    mapRef.current = null;
  };

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        setScriptLoaded(true);
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Removing existing Google Maps script');
        existingScript.remove();
      }

      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      const API_KEY = 'AIzaSyCXShIlIaYEMOMSpbvL8xHArXK0QVw4xSE';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        setScriptLoaded(true);
      };
      
      script.onerror = (error) => {
        console.error('Error loading Google Maps script:', error);
        setScriptError(true);
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
    return cleanup;
  }, []);

  // Initialize the map when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !mapContainerRef.current || mapRef.current) {
      return;
    }

    console.log("Initializing map with coordinates:", defaultLat, defaultLng);
    
    try {
      const mapOptions: google.maps.MapOptions = {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          },
          {
            featureType: "poi.business",
            elementType: "labels", 
            stylers: [{ visibility: "on" }]
          }
        ]
      };

      const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
      mapRef.current = map;
      
      geocoderRef.current = new window.google.maps.Geocoder();
      
      // Create marker with proper icon using SVG path
      const marker = new window.google.maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map: map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: 'اسحبني لتحديد الموقع',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#00b894" stroke="#ffffff" stroke-width="3"/>
              <circle cx="12" cy="12" r="3" fill="#ffffff"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 12)
        }
      });
      markerRef.current = marker;
      
      console.log("Marker created at:", defaultLat, defaultLng);
      
      // Get initial address
      reverseGeocode(defaultLat, defaultLng);
      
      // Add event listeners
      const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        console.log('Map clicked:', e.latLng?.lat(), e.latLng?.lng());
        if (e.latLng && marker) {
          marker.setPosition(e.latLng);
          reverseGeocode(e.latLng.lat(), e.latLng.lng());
        }
      });
      
      const dragendListener = marker.addListener('dragend', () => {
        const position = marker.getPosition();
        console.log('Marker dragged to:', position?.lat(), position?.lng());
        if (position) {
          reverseGeocode(position.lat(), position.lng());
        }
      });
      
      listenersRef.current.push(clickListener, dragendListener);
      
      // Wait for map to be fully loaded
      map.addListener('tilesloaded', () => {
        console.log('Map tiles loaded');
        setMapLoaded(true);
        setIsLoading(false);
      });
      
      // Fallback timeout
      setTimeout(() => {
        console.log("Setting map as loaded (timeout fallback)");
        setMapLoaded(true);
        setIsLoading(false);
      }, 3000);
      
      console.log("Map initialized successfully");
      
    } catch (error) {
      console.error("Error initializing map:", error);
      setScriptError(true);
      setIsLoading(false);
    }
  }, [scriptLoaded, defaultLat, defaultLng]);

  // Reverse geocode to get address
  const reverseGeocode = (lat: number, lng: number) => {
    if (!geocoderRef.current) {
      console.log('Geocoder not available, using coordinates');
      const location = { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
      setSelectedLocation(location);
      return;
    }

    console.log('Reverse geocoding:', lat, lng);
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      console.log('Geocoding result:', status, results);
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
          setLocationPermissionDenied(true);
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
      setLocationPermissionDenied(true);
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
      // Save to localStorage for non-logged users
      localStorage.setItem('selectedLat', selectedLocation.lat.toString());
      localStorage.setItem('selectedLng', selectedLocation.lng.toString());
      localStorage.setItem('selectedAddress', selectedLocation.address);
      
      // Also save additional guest user data
      const guestData = {
        hasLocationData: true,
        locationTimestamp: new Date().toISOString(),
        coordinates: {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng
        },
        address: selectedLocation.address
      };
      localStorage.setItem('guestLocationData', JSON.stringify(guestData));
      
      navigate(-1);
    }
  };

  const handleEnterManually = () => {
    navigate('/address');
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
          <h1 className="text-lg font-bold text-primary">Pin Your Location</h1>
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
            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                إعادة المحاولة
              </Button>
              <Button
                onClick={handleEnterManually}
                variant="outline"
                className="w-full"
              >
                Enter Manually
              </Button>
            </div>
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
        <h1 className="text-lg font-bold text-primary">Pin Your Location</h1>
        <div className="w-10"></div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search a place"
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
          
          {(isLoading || !mapLoaded) && (
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
          
          <div className="space-y-3">
            <Button
              onClick={handleConfirmLocation}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium"
            >
              Select Location
            </Button>
            
            <Button
              onClick={handleEnterManually}
              variant="ghost"
              className="w-full text-primary hover:text-primary/80 py-2 font-medium"
            >
              Enter Manually
            </Button>
          </div>
        </div>
      )}

      {/* Fallback if location permission denied */}
      {locationPermissionDenied && !selectedLocation && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6 text-orange-500" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              لم نتمكن من الوصول إلى موقعك. يمكنك تحديد موقعك يدوياً على الخريطة أو إدخال العنوان.
            </p>
            <Button
              onClick={handleEnterManually}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium"
            >
              Enter Manually
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLocationPicker;
