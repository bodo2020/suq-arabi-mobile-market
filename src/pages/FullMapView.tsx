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
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  
  // Store references to map objects for cleanup
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerInstanceRef = useRef<google.maps.Marker | null>(null);
  const mapListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  
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
      stylers: [{ color: "#212a37" }]
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
  
  // Clean up maps resources on unmount
  useEffect(() => {
    return () => {
      // Clear all listeners
      if (mapListenersRef.current.length > 0) {
        mapListenersRef.current.forEach(listener => {
          if (listener) {
            listener.remove();
          }
        });
        mapListenersRef.current = [];
      }
      
      // Remove marker from map
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setMap(null);
        markerInstanceRef.current = null;
      }
      
      // Clear map instance reference
      mapInstanceRef.current = null;
    };
  }, []);
  
  // Initialize the map once the script is loaded
  useEffect(() => {
    if (!mapRef.current || !mapScriptLoaded) return;
    
    try {
      console.log("Initializing Google Maps");
      
      // Check if Google Maps API is available
      if (window.google && window.google.maps) {
        // Create map options
        const mapOptions: google.maps.MapOptions = {
          center: { lat: initialLat, lng: initialLng },
          zoom: 9, // More zoomed out view
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: darkMapStyle, // Apply dark style
          backgroundColor: '#242f3e', // Dark background color
          zoomControl: true, // Enable zoom controls
          gestureHandling: 'greedy' // Makes the map easier to use on mobile
        };

        // Create new map instance
        const newMap = new window.google.maps.Map(mapRef.current, mapOptions);
        setMap(newMap);
        mapInstanceRef.current = newMap;
        
        // Create marker
        const newMarker = new window.google.maps.Marker({
          position: { lat: initialLat, lng: initialLng },
          map: newMap,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });
        setMarker(newMarker);
        markerInstanceRef.current = newMarker;
        
        // Get initial location address
        reverseGeocode(initialLat, initialLng);
        
        setMapLoaded(true);

        // Add event listeners and store references for cleanup
        const clickListener = newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            newMarker.setPosition(e.latLng);
            reverseGeocode(e.latLng.lat(), e.latLng.lng());
          }
        });
        mapListenersRef.current.push(clickListener);

        const dragendListener = newMarker.addListener('dragend', () => {
          const position = newMarker.getPosition();
          if (position) {
            reverseGeocode(position.lat(), position.lng());
          }
        });
        mapListenersRef.current.push(dragendListener);
      } else {
        console.error("Google Maps API not available");
        toast({
          title: "خطأ",
          description: "لم يتم تحميل خرائط Google بشكل صحيح",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error initializing map:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الخريطة",
        variant: "destructive"
      });
    }
  }, [initialLat, initialLng, mapScriptLoaded, toast]);

  // Get user's current location
  const getUserLocation = () => {
    if (!window.google || !window.google.maps || !map || !marker) {
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
          
          map.setCenter(userLocation);
          map.setZoom(14); // More zoomed in when finding user location
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

  // Zoom in to the map
  const zoomIn = () => {
    if (!map) return;
    const currentZoom = map.getZoom();
    if (currentZoom !== undefined) {
      map.setZoom(currentZoom + 1);
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
        ref={mapRef} 
        className="flex-1 w-full relative"
      >
        {!mapLoaded && (
          <div className="absolute inset-0 bg-[#1a1f25] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
        {/* Zoom in button overlay */}
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
          >
            <MapPin size={16} className="ml-2" />
            تحديد موقعي
          </Button>
          
          <Button
            onClick={handleConfirmLocation}
            className="flex-1 bg-primary hover:bg-primary/90"
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
