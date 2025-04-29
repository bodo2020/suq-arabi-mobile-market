
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, MapPin, Check, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Script from '@/components/ui/Script';

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
          zoom: 9, // More zoomed out view (lower number = more zoomed out)
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: darkMapStyle, // Apply dark style
          backgroundColor: '#242f3e', // Dark background color
          zoomControl: true, // Enable zoom controls for manual zooming
          gestureHandling: 'greedy' // Makes the map easier to use on mobile
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
    <div className="fixed inset-0 bg-[#222222] flex flex-col z-50">
      <Script 
        src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyCkV_5RhFvcX-kXdGh5IsIZzwexnvrx6Fw&libraries=places`}
        onLoad={() => console.log("Google Maps script loaded")} 
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
        
        <div className="flex space-x-3 space-x-reverse">
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
