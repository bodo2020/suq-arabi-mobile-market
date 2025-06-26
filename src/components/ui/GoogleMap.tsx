
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Search, Ruler, Route, AlertTriangle, Navigation, Compass } from 'lucide-react';
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

// Your Google Maps API Key
const API_KEY = 'AIzaSyBhWG1SZE7DCk9qiC4dCs82oqq3GWkVEhg';

// Reference location (Cairo, Egypt)
const REFERENCE_LOCATION = { lat: 30.0444, lng: 31.2357 };

interface MapPin {
  id: string;
  position: google.maps.LatLng;
  title: string;
  marker?: google.maps.Marker;
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
          },
          styles: [
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#e3f2fd' }]
            },
            {
              featureType: 'landscape',
              elementType: 'geometry',
              stylers: [{ color: '#f5f5f5' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Initialize directions service and renderer
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          polylineOptions: {
            strokeColor: '#3b82f6',
            strokeWeight: 5,
            strokeOpacity: 0.8
          },
          suppressMarkers: true,
          markerOptions: {
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          }
        });
        directionsRendererRef.current.setMap(map);

        // Add reference marker with modern styling
        const referenceMarker = new google.maps.Marker({
          position: REFERENCE_LOCATION,
          map: map,
          title: 'موقع القاهرة المرجعي',
          animation: google.maps.Animation.DROP,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        referenceMarkerRef.current = referenceMarker;

        // Add modern info window for reference marker
        const referenceInfoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-3 text-center">
              <div class="flex items-center justify-center mb-2">
                <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <h3 class="font-semibold text-gray-800">الموقع المرجعي</h3>
              </div>
              <p class="text-sm text-gray-600">القاهرة، مصر</p>
              <p class="text-xs text-gray-500 mt-1">
                ${REFERENCE_LOCATION.lat.toFixed(4)}, ${REFERENCE_LOCATION.lng.toFixed(4)}
              </p>
            </div>
          `
        });

        referenceMarker.addListener('click', () => {
          referenceInfoWindow.open(map, referenceMarker);
        });

        // Add click listener to place pins
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            addPin(event.latLng, 'موقع جديد');
          }
        });

        setIsLoaded(true);
        toast({
          title: "تم تحميل الخريطة بنجاح! 🗺️",
          description: "انقر في أي مكان لإضافة نقطة جديدة وعرض الطريق."
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
          title: "تم إنشاء الطريق! 🛣️",
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
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });

    const newPin: MapPin = {
      id: Date.now().toString(),
      position: position,
      title: title,
      marker: marker
    };

    const updatedPins = [...pins, newPin];
    setPins(updatedPins);
    
    calculateDistanceFromReference(position);
    calculateRoute(position);

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-3 text-center">
          <div class="flex items-center justify-center mb-2">
            <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <h3 class="font-semibold text-gray-800">${title}</h3>
          </div>
          <p class="text-xs text-gray-500">
            ${position.lat().toFixed(6)}, ${position.lng().toFixed(6)}
          </p>
          <button 
            onclick="navigator.clipboard.writeText('${position.lat().toFixed(6)}, ${position.lng().toFixed(6)}')"
            class="text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer"
          >
            📋 نسخ الإحداثيات
          </button>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(mapInstanceRef.current, marker);
    });

    toast({
      title: "تم إضافة نقطة! 📍",
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
            title: "تم العثور على الموقع! 🎯",
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
    // Remove all markers from map
    pins.forEach(pin => {
      if (pin.marker) {
        pin.marker.setMap(null);
      }
    });

    setPins([]);
    setSelectedLocation('');
    setDistance(null);
    setRouteDistance(null);
    setRouteDuration(null);
    
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({routes: []} as google.maps.DirectionsResult);
    }
    
    toast({
      title: "تم مسح النقاط 🧹",
      description: "تم حذف جميع النقاط والطرق من الخريطة."
    });
  };

  const centerOnReference = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(REFERENCE_LOCATION);
      mapInstanceRef.current.setZoom(12);
      toast({
        title: "تم التوسيط على الموقع المرجعي",
        description: "عرض القاهرة، مصر"
      });
    }
  };

  // Show error state if there's a loading error
  if (loadingError) {
    return (
      <div className={`w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col ${className}`} style={{ height }}>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-right text-red-800">
                {loadingError}
              </AlertDescription>
            </Alert>
            
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-right">تحقق من إعدادات API:</h3>
                <ol className="text-sm space-y-2 text-right list-decimal list-inside">
                  <li>تأكد من تفعيل Maps JavaScript API</li>
                  <li>تأكد من تفعيل Places API</li>
                  <li>تأكد من تفعيل Directions API</li>
                  <li>تحقق من إعدادات النطاق المسموح</li>
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
      {/* Modern Search Bar */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">خريطة تفاعلية</h2>
              <p className="text-xs text-gray-600">اكتشف واضف المواقع</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex gap-2 flex-1 sm:flex-initial">
              <Input
                placeholder="ابحث عن موقع أو عنوان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                className="min-w-[280px] border-gray-300 focus:border-blue-500 focus:ring-blue-200 rounded-lg"
                disabled={!isLoaded}
              />
              <Button 
                onClick={searchLocation} 
                size="icon" 
                className="bg-blue-600 hover:bg-blue-700 rounded-lg" 
                disabled={!isLoaded}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              onClick={centerOnReference} 
              variant="outline" 
              size="sm" 
              className="border-gray-300 hover:bg-gray-50 rounded-lg"
              disabled={!isLoaded}
            >
              <Compass className="h-4 w-4 mr-1" />
              المركز
            </Button>
            <Button 
              onClick={clearPins} 
              variant="outline" 
              size="sm" 
              className="border-red-300 text-red-600 hover:bg-red-50 rounded-lg"
              disabled={!isLoaded}
            >
              مسح الكل
            </Button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full rounded-lg" />
        
        {!isLoaded && !loadingError && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                <MapPin className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
              </div>
              <p className="text-gray-700 text-lg font-medium">جاري تحميل الخريطة...</p>
              <p className="text-gray-500 text-sm mt-2">يرجى الانتظار قليلاً</p>
            </div>
          </div>
        )}

        {/* Enhanced Stats Card */}
        {isLoaded && (
          <>
            <Card className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-xl max-w-xs">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">{pins.length} نقطة مُضافة</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">النقطة المرجعية</span>
                  </div>
                  {distance && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-green-50 rounded-lg">
                      <Ruler className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-700">
                        مسافة مباشرة: {distance.toFixed(2)} كم
                      </span>
                    </div>
                  )}
                  {routeDistance && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-blue-50 rounded-lg">
                      <Route className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700">
                        مسافة الطريق: {routeDistance}
                      </span>
                    </div>
                  )}
                  {routeDuration && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-purple-50 rounded-lg">
                      <Navigation className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-purple-700">
                        وقت الوصول: {routeDuration}
                      </span>
                    </div>
                  )}
                </div>
                {selectedLocation && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 truncate" title={selectedLocation}>
                      📍 {selectedLocation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-xl max-w-xs">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-800 mb-3">💡 دليل الاستخدام:</p>
                  <ul className="text-xs text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>انقر في أي مكان لإضافة نقطة وعرض الطريق</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>ابحث عن مواقع محددة باستخدام شريط البحث</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500">•</span>
                      <span>انقر على النقاط لرؤية التفاصيل ونسخ الإحداثيات</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>المسافة والوقت محسوبان من القاهرة</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleMap;
