
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';

const Map = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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

    loadGoogleMaps();

    return () => {
      console.log('Cleaning up map component');
    };
  }, [toast]);

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
          <h1 className="text-xl font-bold flex-1 text-center">الخريطة</h1>
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
      </div>
    </MainLayout>
  );
};

export default Map;
