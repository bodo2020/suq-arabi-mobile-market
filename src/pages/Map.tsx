
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
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadGoogleMaps();
    return () => {
      console.log('تنظيف مكون الخريطة');
    };
  }, []);

  const loadGoogleMaps = async () => {
    console.log('تحميل خرائط جوجل لصفحة الخريطة...');
    setIsLoadingMap(true);
    
    try {
      if (window.google && window.google.maps) {
        console.log('خرائط جوجل متاحة بالفعل');
        initializeMap();
        return;
      }

      // إزالة أي سكريبت موجود مسبقاً
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }

      const loadScript = () => {
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw&libraries=places&loading=async`;
          script.async = true;
          script.defer = true;

          script.onload = () => {
            console.log('تم تحميل سكريبت Google Maps بنجاح');
            setTimeout(() => {
              if (window.google && window.google.maps) {
                resolve();
              } else {
                reject(new Error('Google Maps API غير متاح'));
              }
            }, 200);
          };

          script.onerror = () => {
            reject(new Error('فشل في تحميل Google Maps'));
          };

          document.head.appendChild(script);
        });
      };

      await loadScript();
      initializeMap();
    } catch (error) {
      console.error('فشل في تحميل سكريبت Google Maps:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في تحميل الخريطة"
      });
      setIsLoadingMap(false);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.error('حاوي الخريطة أو Google Maps غير متاح');
      return;
    }

    try {
      console.log('إنشاء نسخة خريطة Google...');
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
      console.log('تم إنشاء نسخة الخريطة');

      // إنشاء علامة قابلة للسحب
      const marker = new window.google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: true,
        title: "اسحب لتحديد الموقع",
        animation: window.google.maps.Animation.DROP
      });
      
      markerRef.current = marker;
      setSelectedLocation(defaultLocation);
      console.log('تم إنشاء العلامة ووضعها');

      // معالج سحب العلامة
      marker.addListener('dragend', () => {
        console.log('تم سحب العلامة');
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

      // معالج النقر على الخريطة لنقل العلامة
      map.addListener('click', (event: any) => {
        console.log('تم النقر على الخريطة');
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

      // محاولة الحصول على موقع المستخدم الحالي
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('تم الحصول على موقع المستخدم لصفحة الخريطة');
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
            console.log('لا يمكن الحصول على موقع المستخدم:', error);
          },
          { 
            timeout: 8000, 
            enableHighAccuracy: true,
            maximumAge: 300000
          }
        );
      }

      // التأكد من اكتمال تحميل الخريطة
      map.addListener('tilesloaded', () => {
        console.log('اكتمل تحميل بلاطات الخريطة');
        setIsLoaded(true);
        setIsLoadingMap(false);
      });

      // fallback في حالة عدم تحميل البلاطات
      setTimeout(() => {
        if (!isLoaded) {
          console.log('انتهت مهلة انتظار تحميل الخريطة، تعيين كـ محملة');
          setIsLoaded(true);
          setIsLoadingMap(false);
        }
      }, 5000);

    } catch (error) {
      console.error('خطأ في إنشاء الخريطة:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في إنشاء الخريطة"
      });
      setIsLoadingMap(false);
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
          console.log('تم ترميز العنوان جغرافياً:', results[0].formatted_address);
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
          
          {(isLoadingMap || !isLoaded) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-gray-600">
                  {isLoadingMap ? 'جاري تحميل الخريطة...' : 'جاري تحضير الخريطة...'}
                </p>
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
