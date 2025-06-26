
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Search, Ruler, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

// Declare global google maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

const API_KEY = 'AIzaSyAAVw59DZPSHu3MKe78lz0EvI-QXTJSCqE';

// Reference location (Riyadh, Saudi Arabia)
const REFERENCE_LOCATION = { lat: 24.7136, lng: 46.6753 };

interface MapPin {
  id: string;
  position: google.maps.LatLng;
  title: string;
}

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({
  center = REFERENCE_LOCATION,
  zoom = 10,
  height = '400px',
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const referenceMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
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
          center: center,
          zoom: zoom,
          styles: [
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
            },
            {
              featureType: 'landscape',
              elementType: 'geometry',
              stylers: [{ color: '#f5f5f5' }, { lightness: 20 }]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry.fill',
              stylers: [{ color: '#ffffff' }, { lightness: 17 }]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#ffffff' }, { lightness: 29 }, { weight: 0.2 }]
            },
            {
              featureType: 'road.arterial',
              elementType: 'geometry',
              stylers: [{ color: '#ffffff' }, { lightness: 18 }]
            },
            {
              featureType: 'road.local',
              elementType: 'geometry',
              stylers: [{ color: '#ffffff' }, { lightness: 16 }]
            },
            {
              featureType: 'poi',
              elementType: 'geometry',
              stylers: [{ color: '#f5f5f5' }, { lightness: 21 }]
            }
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
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
          suppressMarkers: true // We'll use custom markers
        });
        directionsRendererRef.current.setMap(map);

        // Add reference marker
        const referenceMarker = new google.maps.Marker({
          position: center,
          map: map,
          title: 'الموقع المرجعي',
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
              <h3 class="font-semibold text-red-600">الموقع المرجعي</h3>
              <p class="text-sm text-gray-600">خط العرض: ${center.lat}</p>
              <p class="text-sm text-gray-600">خط الطول: ${center.lng}</p>
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
          title: "تم تحميل الخريطة بنجاح!",
          description: "انقر في أي مكان على الخريطة لإضافة نقطة جديدة وعرض الطريق."
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
  }, [center, zoom]);

  const calculateRoute = (destination: google.maps.LatLng) => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) return;

    const request = {
      origin: center,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsServiceRef.current.route(request, (result, status) => {
      if (status === 'OK' && result) {
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
    const referenceLatLng = new google.maps.LatLng(center.lat, center.lng);
    
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      referenceLatLng,
      targetPosition
    );
    
    // Convert from meters to kilometers
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
    
    // Calculate straight line distance from reference location
    calculateDistanceFromReference(position);
    
    // Calculate and display route
    calculateRoute(position);

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-2">
          <h3 class="font-semibold text-gray-900">${title}</h3>
          <p class="text-sm text-gray-600">خط العرض: ${position.lat().toFixed(6)}</p>
          <p class="text-sm text-gray-600">خط الطول: ${position.lng().toFixed(6)}</p>
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

  const clearPins = () => {
    setPins([]);
    setSelectedLocation('');
    setDistance(null);
    setRouteDistance(null);
    setRouteDuration(null);
    
    // Clear directions
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({routes: []} as google.maps.DirectionsResult);
    }
    
    // Reload the map to clear all markers except reference
    if (mapInstanceRef.current) {
      const mapCenter = mapInstanceRef.current.getCenter();
      const mapZoom = mapInstanceRef.current.getZoom();
      
      const newMap = new google.maps.Map(mapRef.current!, {
        center: mapCenter,
        zoom: mapZoom,
        styles: mapInstanceRef.current.get('styles'),
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM
        }
      });

      // Re-initialize directions renderer
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 4,
          strokeOpacity: 0.8
        },
        suppressMarkers: true
      });
      directionsRendererRef.current.setMap(newMap);

      // Re-add reference marker
      const referenceMarker = new google.maps.Marker({
        position: center,
        map: newMap,
        title: 'الموقع المرجعي',
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
            <h3 class="font-semibold text-red-600">الموقع المرجعي</h3>
            <p class="text-sm text-gray-600">خط العرض: ${center.lat}</p>
            <p class="text-sm text-gray-600">خط الطول: ${center.lng}</p>
          </div>
        `
      });

      referenceMarker.addListener('click', () => {
        referenceInfoWindow.open(newMap, referenceMarker);
      });

      newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          addPin(event.latLng, 'موقع جديد');
        }
      });

      mapInstanceRef.current = newMap;
    }
    
    toast({
      title: "تم مسح النقاط",
      description: "تم حذف جميع النقاط والطرق من الخريطة."
    });
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Search Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Input
          placeholder="ابحث عن موقع..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
          className="w-48 bg-white/90 backdrop-blur-sm"
        />
        <Button onClick={searchLocation} size="icon" variant="outline" className="bg-white/90 backdrop-blur-sm">
          <Search className="h-4 w-4" />
        </Button>
        <Button onClick={clearPins} variant="outline" size="sm" className="bg-white/90 backdrop-blur-sm">
          مسح
        </Button>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل الخريطة...</p>
          </div>
        </div>
      )}

      {/* Stats Card */}
      <Card className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm border-0 shadow-lg max-w-xs">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span>{pins.length} نقطة مضافة</span>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleMap;
