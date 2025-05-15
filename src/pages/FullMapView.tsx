
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, MapPin, Check, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Script from '@/components/ui/Script';

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
  const [googleInitialized, setGoogleInitialized] = useState(false);
  const [locationPermissionRequested, setLocationPermissionRequested] = useState(false);
  const mapInitializedRef = useRef(false);
  const componentMountedRef = useRef(true);
  
  // Refs for Google Maps objects
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  
  const queryParams = new URLSearchParams(location.search);
  // Using the specified coordinates as default, or get them from query params if present
  const initialLat = parseFloat(queryParams.get('lat') || '31.256702071282238');
  const initialLng = parseFloat(queryParams.get('lng') || '31.167919046401884');
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
    if (componentMountedRef.current) {
      setMapScriptLoaded(true);
    }
  };
  
  // Set componentMountedRef to false when component unmounts
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
    };
  }, []);
  
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
      mapInitializedRef.current = false;
    };
  }, []);
  
  // Initialize the map once the script is loaded and the container is ready
  useEffect(() => {
    // Safety check to ensure we only initialize once and all requirements are met
    if (!mapContainerRef.current || !mapScriptLoaded || !window.google?.maps || googleInitialized || mapInitializedRef.current || !componentMountedRef.current) {
      return;
    }
    
    // Set flag to prevent duplicate initialization
    mapInitializedRef.current = true;
    
    try {
      console.log("Initializing Google Maps");
      setGoogleInitialized(true);
      
      // Create map options
      const mapOptions: google.maps.MapOptions = {
        center: { lat: initialLat, lng: initialLng },
        zoom: 14, // Closer zoom level for better view of the area
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: darkMapStyle, // Apply dark style
        backgroundColor: '#242f3e', // Dark background color
        zoomControl: true, // Enable zoom controls
        gestureHandling: 'greedy' // Makes the map easier to use on mobile
      };

      // Create new map instance with a delay to ensure the container is fully rendered
      const timeoutId = setTimeout(() => {
        if (mapContainerRef.current && window.google?.maps && !mapRef.current && componentMountedRef.current) {
          try {
            // Create map instance
            const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
            mapRef.current = map;
            
            // Wait for map to be initialized before adding markers
            const mapIdleListener = map.addListener('idle', () => {
              if (!componentMountedRef.current) {
                return;
              }
              
              // Create marker only after map is idle
              if (mapRef.current) {
                try {
                  // Create and display the marker with animation
                  const marker = new window.google.maps.Marker({
                    position: { lat: initialLat, lng: initialLng },
                    map: mapRef.current,
                    draggable: true,
                    animation: window.google.maps.Animation.DROP,
                    icon: {
                      path: window.google.maps.SymbolPath.CIRCLE,
                      fillColor: '#4285F4',
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2,
                      scale: 10,
                    }
                  });
                  markerRef.current = marker;
                  
                  // Get initial location address
                  reverseGeocode(initialLat, initialLng);
                  
                  if (componentMountedRef.current) {
                    setMapLoaded(true);
                  }
  
                  // Add event listeners
                  if (componentMountedRef.current) {
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
                  }

                  // Remove the idle listener after first use
                  if (mapIdleListener) {
                    mapIdleListener.remove();
                  }
                  
                  // Request location access after map is loaded
                  if (!locationPermissionRequested && componentMountedRef.current) {
                    setTimeout(() => {
                      if (componentMountedRef.current) {
                        requestLocationAccess();
                      }
                    }, 1000);
                  }
                } catch (error) {
                  console.error("Error setting up marker:", error);
                }
              }
            });
            
          } catch (error) {
            console.error("Error creating map:", error);
            if (componentMountedRef.current) {
              toast({
                title: "خطأ",
                description: "حدث خطأ أثناء إنشاء الخريطة",
                variant: "destructive"
              });
            }
          }
        }
      }, 500); // Increased timeout for more reliability
      
      return () => {
        clearTimeout(timeoutId);
      };
      
    } catch (error) {
      console.error("Error initializing map:", error);
      if (componentMountedRef.current) {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تهيئة الخريطة",
          variant: "destructive"
        });
      }
    }
  }, [initialLat, initialLng, mapScriptLoaded, toast, googleInitialized, darkMapStyle, locationPermissionRequested]);

  // Request user's location permission
  const requestLocationAccess = () => {
    if (!componentMountedRef.current) return;
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
    if (!mapRef.current || !markerRef.current || !componentMountedRef.current) {
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
          if (!componentMountedRef.current) return;
          
          console.log("Got user location:", position.coords);
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          if (mapRef.current && markerRef.current) {
            mapRef.current.setCenter(userLocation);
            mapRef.current.setZoom(16); // More zoomed in when finding user location
            markerRef.current.setPosition(userLocation);
            
            reverseGeocode(userLocation.lat, userLocation.lng);
          }
          
          toast({
            title: "تم تحديد موقعك",
            description: "يمكنك تحريك المؤشر لضبط الموقع بدقة",
          });
        },
        (error) => {
          if (!componentMountedRef.current) return;
          
          console.error("Geolocation error:", error);
          let errorMessage = "يرجى السماح بالوصول إلى الموقع أو تحديده يدويًا";
          
          // Provide more specific error messages based on the error code
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
    if (!window.google || !window.google.maps || !componentMountedRef.current) {
      console.error("Google Maps not loaded");
      return;
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (!componentMountedRef.current) return;
        
        if (status === "OK" && results && results[0]) {
          const addressText = results[0].formatted_address;
          setSelectedLocation({ lat, lng, address: addressText });
        } else {
          console.error("Geocoder failed due to: " + status);
          toast({
            title: "خطأ",
            description: "تعذر الحصول على العنوان لهذا الموقع",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error("Geocoder error:", error);
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
        src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyCkV_5RhFvcX-kXdGh5IsIZzwexnvrx6Fw&libraries=places&callback=Function.prototype`}
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
      >
        {!mapLoaded && (
          <div className="absolute inset-0 bg-[#1a1f25] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
        
        {/* Center pin marker overlay (appears when dragging) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-0">
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
          <div className="mb-4 text-sm text-gray-300">{selectedLocation.address}</div>
        )}
        
        <div className="flex space-x-3 space-x-reverse rtl:space-x-reverse">
          <Button
            onClick={getUserLocation}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-800"
            disabled={!mapLoaded}
          >
            <MapPin size={16} className="ml-2" />
            تحديد موقعي
          </Button>
          
          <Button
            onClick={handleConfirmLocation}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={!selectedLocation}
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
