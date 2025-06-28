
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';

const API_KEY = 'AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw';

// Reference location
const REFERENCE_LOCATION = { lat: 31.2566, lng: 31.1671 };

const MapPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log('Google Maps already loaded');
        resolve();
        return;
      }

      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        console.log('Google Maps script already exists');
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
        return;
      }

      console.log('Loading Google Maps script');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script loaded');
        setTimeout(() => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            resolve();
          } else {
            reject(new Error('Google Maps API not properly initialized'));
          }
        }, 100);
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    const initMap = async () => {
      try {
        console.log('Initializing MapPage...');
        await loadGoogleMapsScript();
        
        if (!window.google || !window.google.maps || !window.google.maps.Map) {
          throw new Error('Google Maps API not available');
        }
        
        if (!mapRef.current) return;

        console.log('Creating map instance');
        const map = new google.maps.Map(mapRef.current, {
          center: REFERENCE_LOCATION,
          zoom: 12,
          mapTypeId: 'satellite',
          // Simplified controls
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'greedy'
        });

        mapInstanceRef.current = map;

        // Add reference marker
        const referenceMarker = new google.maps.Marker({
          position: REFERENCE_LOCATION,
          map: map,
          title: 'Reference Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        // Add click listener to place pins
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            addPin(event.latLng, 'New Location');
          }
        });

        setIsLoaded(true);
        console.log('Map initialized successfully');
        toast({
          title: "تم تحميل الخريطة بنجاح!",
          description: "انقر في أي مكان على الخريطة لإضافة نقطة جديدة."
        });

      } catch (error) {
        console.error('Error loading Google Maps:', error);
        toast({
          title: "خطأ في تحميل الخريطة",
          description: "يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.",
          variant: "destructive"
        });
      }
    };

    initMap();
  }, []);

  const addPin = (position: google.maps.LatLng, title: string) => {
    if (!mapInstanceRef.current) return;

    const marker = new google.maps.Marker({
      position: position,
      map: mapInstanceRef.current,
      title: title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-2">
          <h3 class="font-semibold text-gray-900">${title}</h3>
          <p class="text-sm text-gray-600">Lat: ${position.lat().toFixed(6)}</p>
          <p class="text-sm text-gray-600">Lng: ${position.lng().toFixed(6)}</p>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(mapInstanceRef.current, marker);
    });

    toast({
      title: "تم إضافة نقطة!",
      description: `الموقع: ${position.lat().toFixed(4)}, ${position.lng().toFixed(4)}`
    });
  };

  const searchLocation = async () => {
    if (!searchQuery.trim() || !isLoaded) return;

    const geocoder = new google.maps.Geocoder();
    
    try {
      const result = await geocoder.geocode({ address: searchQuery });
      
      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        const address = result.results[0].formatted_address;
        
        mapInstanceRef.current?.setCenter(location);
        mapInstanceRef.current?.setZoom(15);
        
        addPin(location, address);
        setSelectedLocation(address);
        setSearchQuery('');
        
        toast({
          title: "تم العثور على الموقع!",
          description: address
        });
      } else {
        toast({
          title: "لم يتم العثور على الموقع",
          description: "يرجى المحاولة بكلمة بحث مختلفة.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "خطأ في البحث",
        description: "تعذر البحث عن الموقع. يرجى المحاولة مرة أخرى.",
        variant: "destructive"
      });
    }
  };

  const reloadMap = () => {
    setIsLoaded(false);
    // Reload the page to restart the map
    window.location.reload();
  };

  return (
    <MainLayout>
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 shadow-sm">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate(-1)} 
                variant="ghost" 
                size="sm"
                className="p-2"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <MapPin className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">خريطة تفاعلية</h1>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="flex gap-2 flex-1 sm:flex-initial">
                <Input
                  placeholder="ابحث عن موقع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                  className="min-w-[250px]"
                />
                <Button onClick={searchLocation} size="icon" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={reloadMap} variant="outline" size="sm">
                إعادة تحميل
              </Button>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
          
          {!isLoaded && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل الخريطة...</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <Card className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-2 font-medium">كيفية الاستخدام:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• انقر في أي مكان لإضافة نقطة</li>
                <li>• ابحث عن مواقع محددة</li>
                <li>• انقر على النقاط لرؤية التفاصيل</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default MapPage;
