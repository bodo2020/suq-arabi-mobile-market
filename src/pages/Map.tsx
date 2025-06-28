import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Save } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';

interface SavedLocation {
  lat: number;
  lng: number;
  address?: string;
  timestamp: string;
}

const Map = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        initializeMap();
        return;
      }

      console.log('Loading Google Maps...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps script loaded');
        // Wait a bit for Google Maps to initialize
        setTimeout(() => {
          if (window.google && window.google.maps) {
            console.log('Google Maps fully initialized');
            initializeMap();
          } else {
            console.error('Google Maps failed to initialize properly');
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
      console.log('Initializing map...');
      if (!mapRef.current) {
        console.error('Map container not found');
        return;
      }
      
      if (!window.google || !window.google.maps) {
        console.error('Google Maps not available');
        return;
      }

      try {
        // Default to Cairo, Egypt
        const defaultLocation = { lat: 30.0444, lng: 31.2357 };
        
        console.log('Creating map instance...');
        const map = new window.google.maps.Map(mapRef.current, {
          center: defaultLocation,
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true
        });
        
        mapInstanceRef.current = map;
        console.log('Map created successfully');

        // Add click listener to map
        map.addListener('click', (event: any) => {
          console.log('Map clicked:', event);
          if (event.latLng) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            console.log('Clicked coordinates:', lat, lng);
            setSelectedLocation({ lat, lng });
            addMarker(lat, lng);
            getAddressFromCoordinates(lat, lng);
          }
        });

        // Try to get user's current location
        if (navigator.geolocation) {
          console.log('Getting user location...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Got user location:', position);
              const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              map.setCenter(userLocation);
              setSelectedLocation(userLocation);
              addMarker(userLocation.lat, userLocation.lng);
              getAddressFromCoordinates(userLocation.lat, userLocation.lng);
            },
            (error) => {
              console.log('Could not get user location:', error);
            }
          );
        }

        setIsLoaded(true);
        console.log('Map initialization complete');
      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "فشل في إنشاء الخريطة"
        });
      }
    };

    const addMarker = (lat: number, lng: number) => {
      console.log('Adding marker at:', lat, lng);
      if (!mapInstanceRef.current || !window.google) {
        console.error('Map or Google Maps not available for marker');
        return;
      }

      try {
        // Remove existing marker
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }

        // Add new marker
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: 'الموقع المحدد',
          animation: window.google.maps.Animation.DROP
        });
        
        markerRef.current = marker;
        console.log('Marker added successfully');
      } catch (error) {
        console.error('Error adding marker:', error);
      }
    };

    const getAddressFromCoordinates = (lat: number, lng: number) => {
      console.log('Getting address for coordinates:', lat, lng);
      if (!window.google || !window.google.maps) {
        console.error('Google Maps not available for geocoding');
        return;
      }
      
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat, lng } },
          (results, status) => {
            console.log('Geocoding result:', status, results);
            if (status === 'OK' && results && results[0]) {
              const formattedAddress = results[0].formatted_address;
              console.log('Address found:', formattedAddress);
              setAddress(formattedAddress);
            } else {
              console.log('No address found, using coordinates');
              setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          }
        );
      } catch (error) {
        console.error('Error getting address:', error);
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    };

    loadGoogleMaps();

    return () => {
      // Cleanup
      console.log('Cleaning up map component');
    };
  }, [toast]);

  const saveLocation = () => {
    if (!selectedLocation) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى تحديد موقع على الخريطة أولاً"
      });
      return;
    }

    const locationData: SavedLocation = {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: address,
      timestamp: new Date().toISOString()
    };

    // Save to localStorage
    const savedLocations = JSON.parse(localStorage.getItem('savedLocations') || '[]');
    savedLocations.push(locationData);
    localStorage.setItem('savedLocations', JSON.stringify(savedLocations));

    // Also save as current location
    localStorage.setItem('currentLocation', JSON.stringify(locationData));

    toast({
      title: "تم حفظ الموقع",
      description: "تم حفظ الموقع المحدد بنجاح"
    });

    console.log('Location saved:', locationData);
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

        {/* Map Container */}
        <div className="flex-1 relative">
          <div 
            ref={mapRef} 
            className="w-full h-full" 
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

        {/* Location Info and Save Button */}
        {selectedLocation && (
          <div className="bg-white p-4 shadow-lg">
            <div className="flex items-center mb-2">
              <MapPin size={16} className="text-primary ml-2" />
              <span className="text-sm text-gray-600">الموقع المحدد</span>
            </div>
            <p className="text-sm mb-3">{address || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}</p>
            <button
              onClick={saveLocation}
              className="w-full flex items-center justify-center bg-primary text-white p-3 rounded-lg"
            >
              <Save size={18} className="ml-2" />
              حفظ الموقع
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Map;
