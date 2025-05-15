
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, MapPin, Check, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Script from '@/components/ui/Script';
import { useLocation as useUserLocation } from '@/hooks/useLocation';

interface SelectedLocation {
  lat: number;
  lng: number;
  address: string;
}

const MapView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [locationPermissionRequested, setLocationPermissionRequested] = useState(false);
  const userLocation = useUserLocation();
  
  // Generate unique ID for this map instance
  const mapId = useRef(`map-container-${Math.random().toString(36).substring(2, 9)}`);
  
  // Refs for Google Maps objects
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  
  // Extract query parameters
  const queryParams = new URLSearchParams(location.search);
  const initialLat = parseFloat(queryParams.get('lat') || localStorage.getItem('userLatitude') || '30.0444');
  const initialLng = parseFloat(queryParams.get('lng') || localStorage.getItem('userLongitude') || '31.2357');
  const addressId = queryParams.get('addressId');

  // Load location from local storage on component mount
  useEffect(() => {
    const savedLat = localStorage.getItem('selectedLat');
    const savedLng = localStorage.getItem('selectedLng');
    const savedAddress = localStorage.getItem('selectedAddress');
    
    if (savedLat && savedLng && savedAddress) {
      setSelectedLocation({
        lat: parseFloat(savedLat),
        lng: parseFloat(savedLng),
        address: savedAddress
      });
    }
  }, []);

  // Handle Google Maps script loading
  const handleMapScriptLoad = () => {
    console.log("Google Maps script loaded");
    setMapScriptLoaded(true);
  };
  
  // Clean up maps resources on unmount
  useEffect(() => {
    return () => {
      console.log("Cleaning up map resources");
      
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
      }
      
      // Clear references
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
      setMapInitialized(false);
    };
  }, []);

  // Initialize the map once the script is loaded
  useEffect(() => {
    if (!mapContainerRef.current || !mapScriptLoaded || !window.google?.maps || mapInitialized) {
      return;
    }

    try {
      console.log("Initializing Google Maps");
      
      // Create map options - using light theme for better visibility
      const mapOptions: google.maps.MapOptions = {
        center: { lat: initialLat, lng: initialLng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy'
      };

      // Create the geocoder
      geocoderRef.current = new window.google.maps.Geocoder();

      // Create new map instance with safe error handling
      const mapElement = document.getElementById(mapId.current);
      if (!mapElement) {
        console.error("Map container element not found");
        return;
      }

      const map = new window.google.maps.Map(mapElement, mapOptions);
      mapRef.current = map;
      
      // Set map initialized flag
      setMapInitialized(true);

      // Set up marker once map is idle
      const idleListener = map.addListener('idle', () => {
        if (!mapRef.current) return;
        
        try {
          // Create and set up marker
          if (!markerRef.current) {
            const marker = new window.google.maps.Marker({
              position: { lat: initialLat, lng: initialLng },
              map: mapRef.current,
              draggable: true,
              animation: window.google.maps.Animation.DROP
            });
            markerRef.current = marker;
            
            // Get initial location address
            reverseGeocode(initialLat, initialLng);
            
            // Add event listeners for marker drag
            const dragendListener = marker.addListener('dragend', () => {
              const position = marker.getPosition();
              if (position) {
                reverseGeocode(position.lat(), position.lng());
              }
            });
            listenersRef.current.push(dragendListener);
            
            // Add click listener to map
            const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
              if (e.latLng && markerRef.current) {
                markerRef.current.setPosition(e.latLng);
                reverseGeocode(e.latLng.lat(), e.latLng.lng());
              }
            });
            listenersRef.current.push(clickListener);
          }
          
          setMapLoaded(true);
          
          // Request location access after map is loaded
          if (!locationPermissionRequested) {
            setTimeout(() => {
              requestLocationAccess();
            }, 1000);
          }
        } catch (error) {
          console.error("Error setting up map marker:", error);
        }
        
        // Remove the idle listener after first use
        idleListener.remove();
      });
      
      // Add the idle listener to our collection
      listenersRef.current.push(idleListener);
    } catch (error) {
      console.error("Error initializing map:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تهيئة الخريطة",
        variant: "destructive"
      });
    }
  }, [initialLat, initialLng, mapScriptLoaded, mapContainerRef, locationPermissionRequested, toast, mapInitialized]);

  // Request user's location permission
  const requestLocationAccess = () => {
    setLocationPermissionRequested(true);
    
    toast({
      title: "تحديد الموقع",
      description: "هل تسمح للتطبيق بالوصول إلى موقعك الحالي؟",
      action: (
        <div className="flex gap-2 mt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              toast({
                title: "تم الرفض",
                description: "يمكنك تغيير رأيك لاحقاً بالضغط على زر تحديد موقعي"
              });
            }}
          >
            رفض
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={getUserLocation}
          >
            السماح
          </Button>
        </div>
      ),
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
          console.log("Got user location:", position.coords);
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
          let errorMessage = "يرجى السماح بالوصول إلى الموقع أو تحديده يدويًا";
          
          if (error.code === 1) {
            errorMessage = "تم رفض الوصول إلى الموقع. يرجى تفعيل خدمة تحديد المواقع في إعدادات المتصفح";
          } else if (error.code === 2) {
            errorMessage = "تعذر تحديد موقعك الحالي. يرجى التأكد من تفعيل خدمة GPS";
          } else if (error.code === 3) {
            errorMessage = "انتهت مهلة تحديد الموقع. يرجى المحاولة مرة أخرى";
          }
          
          toast({
            title: "تعذر الوصول إلى موقعك",
            description: errorMessage,
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
  const reverseGeocode = (lat: number, lng: number) => {
    if (!window.google?.maps || !geocoderRef.current) {
      console.error("Google Maps or Geocoder not loaded");
      
      // Still save coordinates even if we can't get an address
      setSelectedLocation({ 
        lat, 
        lng, 
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` 
      });
      
      // Save to localStorage
      localStorage.setItem('selectedLat', lat.toString());
      localStorage.setItem('selectedLng', lng.toString());
      
      return;
    }

    try {
      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const addressText = results[0].formatted_address;
          setSelectedLocation({ lat, lng, address: addressText });
          
          // Save coordinates to localStorage for persistence
          localStorage.setItem('selectedLat', lat.toString());
          localStorage.setItem('selectedLng', lng.toString());
          localStorage.setItem('selectedAddress', addressText);
          
          console.log("Location selected and saved:", { lat, lng, address: addressText });
        } else {
          console.error("Geocoder failed due to:", status);
          // Still save the coordinates even if we can't get an address
          setSelectedLocation({ 
            lat, 
            lng, 
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` 
          });
          localStorage.setItem('selectedLat', lat.toString());
          localStorage.setItem('selectedLng', lng.toString());
          
          toast({
            title: "تنبيه",
            description: "تم حفظ الإحداثيات لكن تعذر الحصول على العنوان"
          });
        }
      });
    } catch (error) {
      console.error("Geocoder error:", error);
      // Still save coordinates even if geocoder fails
      setSelectedLocation({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      localStorage.setItem('selectedLat', lat.toString());
      localStorage.setItem('selectedLng', lng.toString());
    }
  };

  // Navigation handlers
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
    <div className="fixed inset-0 bg-[#222222] flex flex-col z-50">
      <Script 
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCkV_5RhFvcX-kXdGh5IsIZzwexnvrx6Fw&libraries=places&callback=Function.prototype"
        onLoad={handleMapScriptLoad} 
        onError={(error) => console.error("Google Maps script error:", error)}
      />
      
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-[#222222] text-white">
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
      
      {/* Map container */}
      <div className="flex-1 w-full relative">
        {/* We use ID instead of ref to avoid DOM node issues */}
        <div 
          id={mapId.current} 
          className="h-full w-full"
        />
        
        {!mapLoaded && (
          <div className="absolute inset-0 bg-[#1a1f25] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
        
        {/* Center pin marker overlay (appears when user is moving the map) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <MapPin size={36} color="#4285F4" strokeWidth={2.5} />
        </div>
        
        {/* Zoom in button overlay */}
        {mapLoaded && (
          <div className="absolute top-4 end-4 z-10">
            <Button
              onClick={() => {
                if (mapRef.current) {
                  const currentZoom = mapRef.current.getZoom();
                  if (currentZoom !== undefined) {
                    mapRef.current.setZoom(currentZoom + 1);
                  }
                }
              }}
              variant="secondary"
              size="icon"
              className="bg-black/50 text-white hover:bg-black/70"
              aria-label="تكبير"
            >
              <ZoomIn size={18} />
            </Button>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 bg-[#222222] border-t border-gray-700 text-white">
        {selectedLocation && (
          <div className="mb-4 text-sm text-gray-300">
            <div className="mb-1">
              <span className="font-bold">الإحداثيات: </span>
              <span>{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</span>
            </div>
            <div>{selectedLocation.address}</div>
          </div>
        )}
        
        <div className="flex gap-3">
          <Button
            onClick={getUserLocation}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-800"
            disabled={!mapLoaded}
          >
            <MapPin size={16} className="ltr:mr-2 rtl:ml-2" />
            تحديد موقعي
          </Button>
          
          <Button
            onClick={handleConfirmLocation}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={!selectedLocation}
          >
            <Check size={16} className="ltr:mr-2 rtl:ml-2" />
            تأكيد الموقع
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MapView;
