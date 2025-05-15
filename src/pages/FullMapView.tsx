
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

const FullMapView: React.FC = () => {
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
  
  // Refs for Google Maps objects - moved outside useEffect for better cleanup
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  
  const queryParams = new URLSearchParams(location.search);
  const initialLat = parseFloat(queryParams.get('lat') || '30.0444');
  const initialLng = parseFloat(queryParams.get('lng') || '31.2357');
  const addressId = queryParams.get('addressId');

  // Dark mode map style
  const darkMapStyle = [
    {
      elementType: "geometry",
      stylers: [{ color: "#242f3e" }]
    },
    {
      elementType: "labels.text.stroke",
      stylers: [{ color: "#242f3e" }]
    },
    {
      elementType: "labels.text.fill",
      stylers: [{ color: "#746855" }]
    },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }]
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }]
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }]
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }]
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }]
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212835" }]
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }]
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }]
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }]
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }]
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }]
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }]
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }]
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }]
    }
  ];

  // Handle Google Maps script loading
  const handleMapScriptLoad = () => {
    console.log("Google Maps script loaded");
    setMapScriptLoaded(true);
  };
  
  // Clean up maps resources on unmount - improved cleanup logic
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
          markerRef.current = null;
        } catch (e) {
          console.error("Error removing marker:", e);
        }
      }
      
      mapRef.current = null;
      setMapInitialized(false);
    };
  }, []);
  
  // Initialize the map once the script is loaded and the container is ready
  useEffect(() => {
    if (!mapContainerRef.current || !mapScriptLoaded || !window.google?.maps || mapInitialized) {
      return;
    }

    console.log("Initializing Google Maps");
    
    try {
      // Create map options
      const mapOptions: google.maps.MapOptions = {
        center: { lat: initialLat, lng: initialLng },
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: darkMapStyle,
        backgroundColor: '#242f3e',
        zoomControl: true,
        gestureHandling: 'greedy'
      };

      // Create new map instance
      const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
      mapRef.current = map;
      
      // Only set this after map is fully initialized
      setMapInitialized(true);

      // Create marker only after map is idle - using a safer approach
      const mapIdleListener = map.addListener('idle', () => {
        if (!mapRef.current) return;
        
        // Only create marker if it doesn't exist
        if (!markerRef.current) {
          try {
            // Create and display the marker with SVG icon instead of path
            const marker = new window.google.maps.Marker({
              position: { lat: initialLat, lng: initialLng },
              map: mapRef.current,
              draggable: true,
              animation: window.google.maps.Animation.DROP,
              icon: {
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#4285F4" stroke="#FFFFFF" stroke-width="2"><circle cx="12" cy="12" r="10" /></svg>'
                ),
                scaledSize: new window.google.maps.Size(20, 20),
                anchor: new window.google.maps.Point(10, 10)
              }
            });
            markerRef.current = marker;
            
            // Get initial location address
            reverseGeocode(initialLat, initialLng);
            
            setMapLoaded(true);

            // Add event listeners
            const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
              if (e.latLng && markerRef.current) {
                markerRef.current.setPosition(e.latLng);
                reverseGeocode(e.latLng.lat(), e.latLng.lng());
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
          } catch (error) {
            console.error("Error setting up marker:", error);
          }
        }

        // Remove the idle listener after first use
        mapIdleListener.remove();
        
        // Request location access after map is loaded
        if (!locationPermissionRequested) {
          setTimeout(() => {
            requestLocationAccess();
          }, 1000);
        }
      });
      
      // Add the idle listener to our collection for cleanup
      listenersRef.current.push(mapIdleListener);

    } catch (error) {
      console.error("Error initializing map:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تهيئة الخريطة",
        variant: "destructive"
      });
    }
  }, [initialLat, initialLng, mapScriptLoaded, darkMapStyle, locationPermissionRequested, toast]);

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

  // Zoom in to the map
  const zoomIn = () => {
    if (!mapRef.current) return;
    const currentZoom = mapRef.current.getZoom();
    if (currentZoom !== undefined) {
      mapRef.current.setZoom(currentZoom + 1);
    }
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = (lat: number, lng: number) => {
    if (!window.google || !window.google.maps) {
      console.error("Google Maps not loaded");
      return;
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const addressText = results[0].formatted_address;
          setSelectedLocation({ lat, lng, address: addressText });
          
          // Save coordinates to localStorage for persistence
          localStorage.setItem('selectedLat', lat.toString());
          localStorage.setItem('selectedLng', lng.toString());
          localStorage.setItem('selectedAddress', addressText);
          
          console.log("Location selected and saved:", { lat, lng, address: addressText });
        } else {
          console.error("Geocoder failed due to: " + status);
          // Still save the coordinates even if we can't get an address
          setSelectedLocation({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
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
      
      {/* Map takes up most of the screen */}
      <div 
        ref={mapContainerRef} 
        className="flex-1 w-full relative"
        id="map-container"
      >
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
              onClick={zoomIn}
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

export default FullMapView;
