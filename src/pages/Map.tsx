
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';

const Map = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadGoogleMaps();
    return () => {
      console.log('Cleaning up map component');
      // Clean up global callback
      if ((window as any).initMapForMap) {
        delete (window as any).initMapForMap;
      }
    };
  }, []);

  const loadGoogleMaps = () => {
    console.log('Loading Google Maps for Map page...');
    
    if (window.google && window.google.maps) {
      console.log('Google Maps already available');
      initializeMap();
      return;
    }

    // Remove existing script if any
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw&libraries=places&callback=initMapForMap`;
    script.async = true;
    script.defer = true;

    // Create a unique global callback function for this component
    (window as any).initMapForMap = () => {
      console.log('Google Maps callback for Map page triggered');
      setTimeout(() => {
        if (window.google && window.google.maps) {
          console.log('Initializing map for Map page...');
          initializeMap();
        } else {
          console.error('Google Maps failed to initialize');
          toast({
            variant: "destructive",
            title: "خطأ",
            description: "فشل في تحميل الخريطة"
          });
        }
      }, 100);
    };

    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في تحميل الخريطة"
      });
    };
    
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.error('Map container or Google Maps not available');
      return;
    }

    try {
      console.log('Creating Google Map instance...');
      const defaultLocation = { lat: 30.0444, lng: 31.2357 };
      
      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy'
      });
      
      mapInstanceRef.current = map;
      console.log('Map instance created');

      // Create draggable marker
      const marker = new window.google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: true,
        title: "اسحب لتحديد الموقع",
        animation: window.google.maps.Animation.DROP
      });
      
      markerRef.current = marker;
      setSelectedLocation(defaultLocation);
      console.log('Marker created and positioned');

      // Handle marker drag
      marker.addListener('dragend', () => {
        console.log('Marker dragged');
        const position = marker.getPosition();
        if (position) {
          const newLocation = {
            lat: position.lat(),
            lng: position.lng()
          };
          setSelectedLocation(newLocation);
          reverseGeocode(newLocation);
        }
      });

      // Handle map click to move marker
      map.addListener('click', (event: any) => {
        console.log('Map clicked');
        if (event.latLng) {
          const newLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          marker.setPosition(newLocation);
          setSelectedLocation(newLocation);
          reverseGeocode(newLocation);
        }
      });

      // Try to get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Got user location for Map page');
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            map.setCenter(userLocation);
            marker.setPosition(userLocation);
            setSelectedLocation(userLocation);
            reverseGeocode(userLocation);
          },
          (error) => {
            console.log('Could not get user location:', error);
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      }

      setIsLoaded(true);
      console.log('Map initialization completed successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في إنشاء الخريطة"
      });
    }
  };

  const reverseGeocode = (location: {lat: number, lng: number}) => {
    if (!window.google || !window.google.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { location: location },
      (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setAddress(results[0].formatted_address);
          console.log('Address geocoded:', results[0].formatted_address);
        }
      }
    );
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <MainLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center p-4 bg-white shadow-sm z-10">
          <button onClick={handleBack} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تحديد الموقع</h1>
          <div className="w-10" />
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-3 border-l-4 border-blue-400">
          <div className="flex items-center">
            <MapPin size={18} className="text-blue-600 ml-2" />
            <p className="text-blue-800 text-sm">
              اضغط على الخريطة أو اسحب الدبوس لتحديد موقعك بدقة
            </p>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div 
            ref={mapRef} 
            className="w-full h-full bg-gray-100" 
            style={{ minHeight: '400px' }}
          />
          
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-gray-600">جاري تحميل الخريطة...</p>
              </div>
            </div>
          )}
        </div>

        {/* Location Info */}
        {selectedLocation && (
          <div className="bg-white p-4 border-t shadow-lg">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-primary mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">الموقع المحدد</h3>
                {address && (
                  <p className="text-gray-600 text-sm mb-2">{address}</p>
                )}
                <p className="text-xs text-gray-500">
                  الإحداثيات: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Map;
