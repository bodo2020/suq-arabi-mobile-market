import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Search, Ruler, Route, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

// Declare global google maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

// REPLACE THIS WITH YOUR GOOGLE MAPS API KEY
const API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

// Reference location
const REFERENCE_LOCATION = { lat: 31.2566, lng: 31.1671 };

interface MapPin {
  id: string;
  position: google.maps.LatLng;
  title: string;
}

interface GoogleMapProps {
  height?: string;
  className?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ height = '100vh', className = '' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const referenceMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [distance, setDistance] = useState<number | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      // Check if API key is set
      if (API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        setLoadingError('يرجى تعيين مفتاح Google Maps API صحيح في الكود');
        return;
      }

      const loader = new Loader({
        apiKey: API_KEY,
        version: 'weekly',
        libraries: ['places', 'geometry']
      });

      try {
        await loader.load();
        
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: REFERENCE_LOCATION,
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
          }
        });

        mapInstanceRef.current = map;

        // Initialize directions service and renderer
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          polylineOptions: {
            strokeColor: '#3b82f6',
            strokeWeight: 4,
            strokeOpacity: 0.8
          },
          suppressMarkers: true
        });
        directionsRendererRef.current.setMap(map);

        // Add reference marker
        const referenceMarker = new google.maps.Marker({
          position: REFERENCE_LOCATION,
          map: map,
          title: 'Reference Location',
          animation: google.maps.Animation.DROP,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        referenceMarkerRef.current = referenceMarker;

        // Add info window for reference marker
        const referenceInfoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold text-red-600">Reference Location</h3>
              <p class="text-sm text-gray-600">Lat: ${REFERENCE_LOCATION.lat}</p>
              <p class="text-sm text-gray-600">Lng: ${REFERENCE_LOCATION.lng}</p>
            </div>
          `
        });

        referenceMarker.addListener('click', () => {
          referenceInfoWindow.open(map, referenceMarker);
        });

        // Add click listener to place pins
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            addPin(event.latLng, 'New Location');
          }
        });

        setIsLoaded(true);
        toast({
          title: "تم تحميل الخريطة بنجاح!",
          description: "انقر في أي مكان على الخريطة لإضافة نقطة جديدة وعرض الطريق."
        });

      } catch (error) {
        console.error('Error loading Google Maps:', error);
        let errorMessage = "خطأ في تحميل الخريطة";
        
        if (error instanceof Error) {
          if (error.message.includes('ApiNotActivatedMapError')) {
            errorMessage = "يجب تفعيل Maps JavaScript API في Google Cloud Console";
          } else if (error.message.includes('InvalidKeyMapError')) {
            errorMessage = "مفتاح Google Maps API غير صحيح";
          } else if (error.message.includes('RefererNotAllowedMapError')) {
            errorMessage = "النطاق غير مسموح في إعدادات API";
          }
        }
        
        setLoadingError(errorMessage);
        toast({
          title: "خطأ في تحميل الخريطة",
          description: errorMessage,
          variant: "destructive"
        });
      }
    };

    initMap();
  }, []);

  const calculateRoute = (destination: google.maps.LatLng) => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) return;

    const request = {
      origin: REFERENCE_LOCATION,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsServiceRef.current.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        directionsRendererRef.current?.setDirections(result);
        
        const route = result.routes[0];
        const leg = route.legs[0];
        
        setRouteDistance(leg.distance?.text || null);
        setRouteDuration(leg.duration?.text || null);
        
        toast({
          title: "تم إنشاء الطريق!",
          description: `المسافة: ${leg.distance?.text} - الوقت: ${leg.duration?.text}`
        });
      } else {
        console.error('Directions request failed:', status);
        toast({
          title: "خطأ في الطريق",
          description: "تعذر إنشاء طريق إلى هذا الموقع.",
          variant: "destructive"
        });
      }
    });
  };

  const calculateDistanceFromReference = (targetPosition: google.maps.LatLng) => {
    const referenceLatLng = new google.maps.LatLng(REFERENCE_LOCATION.lat, REFERENCE_LOCATION.lng);
    
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      referenceLatLng,
      targetPosition
    );
    
    const distanceInKm = distance / 1000;
    setDistance(distanceInKm);
  };

  const addPin = (position: google.maps.LatLng, title: string) => {
    if (!mapInstanceRef.current) return;

    const marker = new google.maps.Marker({
      position: position,
      map: mapInstanceRef.current,
      title: title,
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    const newPin: MapPin = {
      id: Date.now().toString(),
      position: position,
      title: title
    };

    const updatedPins = [...pins, newPin];
    setPins(updatedPins);
    
    calculateDistanceFromReference(position);
    calculateRoute(position);

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
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const location = results[0].geometry.location;
          const address = results[0].formatted_address;
          
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
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "خطأ في البحث",
        description: "تعذر البحث عن الموقع. يرجى المحاولة مرة أخرى.",
        variant: "destructive"
      });
    }
  };

  const clearPins = () => {
    setPins([]);
    setSelectedLocation('');
    setDistance(null);
    setRouteDistance(null);
    setRouteDuration(null);
    
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({routes: []} as google.maps.DirectionsResult);
    }
    
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      const zoom = mapInstanceRef.current.getZoom();
      
      const newMap = new google.maps.Map(mapRef.current!, {
        center: center,
        zoom: zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM
        }
      });

      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 4,
          strokeOpacity: 0.8
        },
        suppressMarkers: true
      });
      directionsRendererRef.current.setMap(newMap);

      const referenceMarker = new google.maps.Marker({
        position: REFERENCE_LOCATION,
        map: newMap,
        title: 'Reference Location',
        animation: google.maps.Animation.DROP,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      });

      referenceMarkerRef.current = referenceMarker;

      const referenceInfoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold text-red-600">Reference Location</h3>
            <p class="text-sm text-gray-600">Lat: ${REFERENCE_LOCATION.lat}</p>
            <p class="text-sm text-gray-600">Lng: ${REFERENCE_LOCATION.lng}</p>
          </div>
        `
      });

      referenceMarker.addListener('click', () => {
        referenceInfoWindow.open(newMap, referenceMarker);
      });

      newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          addPin(event.latLng, 'New Location');
        }
      });

      mapInstanceRef.current = newMap;
    }
    
    toast({
      title: "تم مسح النقاط",
      description: "تم حذف جميع النقاط والطرق من الخريطة."
    });
  };

  // Show error state if there's a loading error
  if (loadingError) {
    return (
      <div className={`w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col ${className}`} style={{ height }}>
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">خريطة تفاعلية مع الطرق</h1>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-right">
                {loadingError}
              </AlertDescription>
            </Alert>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-right">كيفية الحصول على مفتاح Google Maps API:</h3>
                <ol className="text-sm space-y-2 text-right list-decimal list-inside">
                  <li>اذهب إلى <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                  <li>أنشئ مشروع جديد أو اختر مشروع موجود</li>
                  <li>فعّل Maps JavaScript API</li>
                  <li>أنشئ مفتاح API جديد</li>
                  <li>انسخ المفتاح واستبدله في الكود</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col ${className}`} style={{ height }}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">خريطة تفاعلية مع الطرق</h1>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex gap-2 flex-1 sm:flex-initial">
              <Input
                placeholder="ابحث عن موقع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                className="min-w-[250px]"
                disabled={!isLoaded}
              />
              <Button onClick={searchLocation} size="icon" variant="outline" disabled={!isLoaded}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={clearPins} variant="outline" size="sm" disabled={!isLoaded}>
              مسح النقاط
            </Button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        
        {!isLoaded && !loadingError && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">جاري تحميل الخريطة...</p>
              <p className="text-gray-500 text-sm mt-2">يرجى الانتظار</p>
            </div>
          </div>
        )}

        {/* Stats Card */}
        {isLoaded && (
          <>
            <Card className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>{pins.length} نقطة مضافة</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span>النقطة المرجعية</span>
                </div>
                {distance && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Ruler className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700">
                      مسافة مباشرة: {distance.toFixed(2)} كم
                    </span>
                  </div>
                )}
                {routeDistance && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Route className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-700">
                      مسافة الطريق: {routeDistance}
                    </span>
                  </div>
                )}
                {routeDuration && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Route className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-700">
                      وقت الوصول: {routeDuration}
                    </span>
                  </div>
                )}
                {selectedLocation && (
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">
                    {selectedLocation}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">كيفية الاستخدام:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• انقر في أي مكان لإضافة نقطة وعرض الطريق</li>
                  <li>• ابحث عن مواقع محددة</li>
                  <li>• انقر على النقاط لرؤية التفاصيل</li>
                  <li>• الخط الأزرق يوضح الطريق بين النقاط</li>
                  <li>• المسافة والوقت محسوبان من النقطة الحمراء</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleMap;
