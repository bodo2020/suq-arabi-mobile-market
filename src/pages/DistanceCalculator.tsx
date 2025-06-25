
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Calculator, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LocationPoint {
  lat: number;
  lng: number;
  label: string;
}

const DistanceCalculator: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  
  // Default to Cairo
  const defaultLat = 30.0444;
  const defaultLng = 31.2357;
  
  // Refs for Google Maps objects
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // Clean up function
  const cleanup = () => {
    console.log('Cleaning up map resources');
    
    if (listenersRef.current.length > 0) {
      listenersRef.current.forEach(listener => {
        try {
          listener.remove();
        } catch (e) {
          console.error('Error removing listener:', e);
        }
      });
      listenersRef.current = [];
    }
    
    markersRef.current.forEach(marker => {
      try {
        marker.setMap(null);
      } catch (e) {
        console.error('Error removing marker:', e);
      }
    });
    markersRef.current = [];
    
    if (polylineRef.current) {
      try {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      } catch (e) {
        console.error('Error removing polyline:', e);
      }
    }
    
    mapRef.current = null;
  };

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        setScriptLoaded(true);
        setIsLoading(false);
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script already exists');
        existingScript.addEventListener('load', () => {
          setScriptLoaded(true);
          setIsLoading(false);
        });
        return;
      }

      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      const API_KEY = 'AIzaSyCXShIlIaYEMOMSpbvL8xHArXK0QVw4xSE';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        setScriptLoaded(true);
        setIsLoading(false);
      };
      
      script.onerror = (error) => {
        console.error('Error loading Google Maps script:', error);
        setScriptError(true);
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
    return cleanup;
  }, []);

  // Initialize the map when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !mapContainerRef.current || mapRef.current) {
      return;
    }

    console.log("Initializing distance calculator map");
    
    try {
      const mapOptions: google.maps.MapOptions = {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 12,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          {
            featureType: "all",
            elementType: "geometry.fill",
            stylers: [{ weight: "2.00" }]
          },
          {
            featureType: "all",
            elementType: "geometry.stroke",
            stylers: [{ color: "#9c9c9c" }]
          },
          {
            featureType: "all",
            elementType: "labels.text",
            stylers: [{ visibility: "on" }]
          }
        ]
      };

      const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
      mapRef.current = map;
      
      // Add click listener to add points
      const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng && points.length < 2) {
          addPoint(e.latLng.lat(), e.latLng.lng());
        }
      });
      
      listenersRef.current.push(clickListener);
      
      // Wait for map to be fully loaded
      const tilesLoadedListener = map.addListener('tilesloaded', () => {
        console.log('Distance calculator map tiles loaded');
        setMapLoaded(true);
      });
      
      listenersRef.current.push(tilesLoadedListener);
      
      // Fallback timeout
      setTimeout(() => {
        console.log("Setting distance calculator map as loaded (timeout fallback)");
        setMapLoaded(true);
      }, 2000);
      
      console.log("Distance calculator map initialized successfully");
      
    } catch (error) {
      console.error("Error initializing distance calculator map:", error);
      setScriptError(true);
      setIsLoading(false);
    }
  }, [scriptLoaded, points.length]);

  const addPoint = (lat: number, lng: number) => {
    if (points.length >= 2) return;
    
    const newPoint: LocationPoint = {
      lat,
      lng,
      label: points.length === 0 ? 'النقطة الأولى' : 'النقطة الثانية'
    };
    
    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    
    // Create marker with custom icon
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapRef.current,
      title: newPoint.label,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="15" fill="${points.length === 0 ? '#00b894' : '#e74c3c'}" stroke="#ffffff" stroke-width="3"/>
            <text x="20" y="25" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${points.length + 1}</text>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20)
      }
    });
    
    markersRef.current.push(marker);
    
    // If we have two points, calculate distance and draw line
    if (newPoints.length === 2) {
      calculateDistance(newPoints[0], newPoints[1]);
      drawLine(newPoints[0], newPoints[1]);
    }
    
    toast({
      title: "تم إضافة النقطة",
      description: `تم إضافة ${newPoint.label} بنجاح`,
    });
  };
  
  const calculateDistance = (point1: LocationPoint, point2: LocationPoint) => {
    if (!window.google?.maps?.geometry?.spherical) {
      console.error('Google Maps Geometry library not loaded');
      return;
    }
    
    const latLng1 = new window.google.maps.LatLng(point1.lat, point1.lng);
    const latLng2 = new window.google.maps.LatLng(point2.lat, point2.lng);
    
    const distanceInMeters = window.google.maps.geometry.spherical.computeDistanceBetween(latLng1, latLng2);
    const distanceInKm = distanceInMeters / 1000;
    
    setDistance(distanceInKm);
  };
  
  const drawLine = (point1: LocationPoint, point2: LocationPoint) => {
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }
    
    const polyline = new window.google.maps.Polyline({
      path: [
        { lat: point1.lat, lng: point1.lng },
        { lat: point2.lat, lng: point2.lng }
      ],
      geodesic: true,
      strokeColor: '#005931',
      strokeOpacity: 1.0,
      strokeWeight: 3
    });
    
    polyline.setMap(mapRef.current);
    polylineRef.current = polyline;
  };
  
  const clearPoints = () => {
    // Clear markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Clear polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    
    // Clear state
    setPoints([]);
    setDistance(null);
    
    toast({
      title: "تم مسح النقاط",
      description: "تم مسح جميع النقاط من الخريطة",
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Render error state
  if (scriptError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} className="text-primary" />
          </button>
          <h1 className="text-lg font-bold text-primary">حاسبة المسافات</h1>
          <div className="w-10"></div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">خطأ في تحميل الخريطة</h2>
            <p className="text-gray-600 mb-6">
              لم نتمكن من تحميل خدمة الخرائط. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="الرجوع"
        >
          <ArrowRight size={24} className="text-primary" />
        </button>
        <h1 className="text-lg font-bold text-primary">حاسبة المسافات</h1>
        <div className="w-10"></div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-blue-900">كيفية الاستخدام</h2>
        </div>
        <p className="text-sm text-blue-700">
          اضغط على الخريطة لإضافة نقطتين، وسيتم حساب المسافة بينهما تلقائياً
        </p>
      </div>
      
      {/* Map container */}
      <div className="flex-1 p-4">
        <div className="h-full w-full relative bg-white rounded-xl overflow-hidden shadow-lg" style={{ minHeight: '400px' }}>
          <div 
            ref={mapContainerRef}
            className="h-full w-full"
          />
          
          {(isLoading || !mapLoaded) && (
            <div className="absolute inset-0 bg-white flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل الخريطة...</p>
                <p className="text-sm text-gray-500 mt-2">قد يستغرق هذا بضع ثوانٍ</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Results Panel */}
      <div className="p-4 bg-white border-t border-gray-200">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-center">النتائج</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">عدد النقاط المضافة</p>
                <p className="text-2xl font-bold text-primary">{points.length} / 2</p>
              </div>
              
              {distance !== null && (
                <div className="text-center border-t pt-3">
                  <p className="text-sm text-gray-600 mb-1">المسافة بين النقطتين</p>
                  <p className="text-3xl font-bold text-green-600">
                    {distance.toFixed(2)} كم
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ({(distance * 1000).toFixed(0)} متر)
                  </p>
                </div>
              )}
              
              {points.length > 0 && (
                <Button
                  onClick={clearPoints}
                  variant="outline"
                  className="w-full mt-4"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  مسح جميع النقاط
                </Button>
              )}
              
              {points.length < 2 && (
                <div className="text-center text-sm text-gray-500 mt-2">
                  {points.length === 0 
                    ? "اضغط على الخريطة لإضافة النقطة الأولى" 
                    : "اضغط على الخريطة لإضافة النقطة الثانية"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DistanceCalculator;
