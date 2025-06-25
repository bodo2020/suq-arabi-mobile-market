
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Script from '@/components/ui/Script';

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
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapInitialized, setMapInitialized] = useState(false);
  
  // Default to Cairo if no initial location provided
  const defaultLat = initialLocation?.lat || 30.0444;
  const defaultLng = initialLocation?.lng || 31.2357;
  
  // Refs for Google Maps objects
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // Handle Google Maps script loading
  const handleMapScriptLoad = () => {
    console.log("Google Maps script loaded");
    setMapScriptLoaded(true);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log("Cleaning up map resources");
      
      // Clear all listeners
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
      
      // Remove marker
      if (markerRef.current) {
        try {
          markerRef.current.setMap(null);
        } catch (e) {
          console.error("Error removing marker:", e);
        }
        markerRef.current = null;
      }
      
      mapRef.current = null;
      geocoderRef.current = null;
      setMapInitialized(false);
    };
  }, []);

  // Initialize the map
  useEffect(() => {
    if (!mapScriptLoaded || !window.google?.maps || mapInitialized) {
      return;
    }

    try {
      console.log("Initializing Google Maps");
      
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
          }
        ]
      };

      const mapElement = mapContainerRef.current;
      if (!mapElement) {
        console.error("Map container element not found");
        return;
      }

      const map = new window.google.maps.Map(mapElement, mapOptions);
      mapRef.current = map;
      
      // Initialize services
      geocoderRef.current = new window.google.maps.Geocoder();
      
      setMapInitialized(true);

      // Set up marker and events when map is idle
      const idleListener = map.addListener('idle', () => {
        if (!mapRef.current) return;
        
        try {
          if (!markerRef.current) {
            const marker = new window.google.maps.Marker({
              position: { lat: defaultLat, lng: defaultLng },
              map: mapRef.current,
              draggable: true,
              animation: window.google.maps.Animation.DROP,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#22c55e">
                    <circle cx="12" cy="12" r="8" stroke="#ffffff" stroke-width="2"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(24, 24),
                anchor: new window.google.maps.Point(12, 12)
              }
            });
            markerRef.current = marker;
            
            // Get initial location address
            reverseGeocode(defaultLat, defaultLng);
            
            // Add marker drag listener
            const dragendListener = marker.addListener('dragend', () => {
              const position = marker.getPosition();
              if (position) {
                reverseGeocode(position.lat(), position.lng());
              }
            });
            listenersRef.current.push(dragendListener);
            
            // Add map click listener
            const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
              if (e.latLng && markerRef.current) {
                markerRef.current.setPosition(e.latLng);
                reverseGeocode(e.latLng.lat(), e.latLng.lng());
              }
            });
            listenersRef.current.push(clickListener);
          }
          
          setMapLoaded(true);
        } catch (error) {
          console.error("Error setting up map marker:", error);
        }
        
        idleListener.remove();
      });
      
      listenersRef.current.push(idleListener);
    } catch (error) {
      console.error("Error initializing map:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تهيئة الخريطة",
        variant: "destructive"
      });
    }
  }, [defaultLat, defaultLng, mapScriptLoaded, toast, mapInitialized]);

  // Reverse geocode to get address
  const reverseGeocode = (lat: number, lng: number) => {
    if (!geocoderRef.current) return;

    try {
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
    } catch (error) {
      console.error("Geocoder error:", error);
      const location = { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
      setSelectedLocation(location);
    }
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

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      <Script 
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCkV_5RhFvcX-kXdGh5IsIZzwexnvrx6Fw&callback=Function.prototype"
        onLoad={handleMapScriptLoad} 
        onError={(error) => console.error("Google Maps script error:", error)}
      />
      
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
        <h1 className="text-lg font-bold text-primary">اختر موقعك</h1>
        <div className="w-10"></div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="ابحث عن مكان أو عنوان"
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
      
      {/* Map container with rounded corners */}
      <div className="flex-1 p-4 bg-gray-50">
        <div className="h-full w-full relative bg-white rounded-3xl overflow-hidden shadow-lg">
          <div 
            ref={mapContainerRef}
            className="h-full w-full"
          />
          
          {!mapLoaded && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
          
          {/* Instructions overlay */}
          {mapLoaded && (
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                <p className="text-sm text-gray-700 text-center">
                  اضغط على الخريطة أو اسحب المؤشر لتحديد موقعك
                </p>
              </div>
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
            <Check size={20} className="ml-2" />
            تأكيد الموقع
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapLocationPicker;
