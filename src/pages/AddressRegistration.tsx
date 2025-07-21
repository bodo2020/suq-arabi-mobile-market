import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import LocationPicker, { LocationValue } from '@/components/ui/LocationPicker';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const AddressRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  const [useMap, setUseMap] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [address, setAddress] = useState('');
  const [locationValue, setLocationValue] = useState<LocationValue>({
    governorate: "",
    city: "",
    area: "",
    neighborhood: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (useMap && !mapError) {
      loadGoogleMaps();
    }
    return () => {
      // تنظيف الخريطة عند الخروج
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
    };
  }, [useMap, mapError]);

  const loadGoogleMaps = async () => {
    if (isLoadingMap) return;
    
    console.log('بدء تحميل Google Maps...');
    setIsLoadingMap(true);
    setMapError(false);
    
    try {
      // التحقق من وجود Google Maps مسبقاً
      if (window.google && window.google.maps) {
        console.log('Google Maps متاح بالفعل');
        initializeMap();
        return;
      }

      // إزالة أي سكريبت سابق
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
        console.log('تم إزالة سكريبت Google Maps السابق');
      }

      // تحميل Google Maps مع معالجة أفضل للأخطاء
      await new Promise<void>((resolve, reject) => {
        window.initMap = () => {
          console.log('تم استدعاء initMap callback');
          resolve();
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw&libraries=places&callback=initMap&loading=async`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log('تم تحميل سكريبت Google Maps');
        };
        
        script.onerror = (error) => {
          console.error('فشل في تحميل سكريبت Google Maps:', error);
          reject(new Error('فشل في تحميل Google Maps'));
        };
        
        document.head.appendChild(script);
        
        // timeout للتأكد من عدم التعليق
        setTimeout(() => {
          reject(new Error('انتهت مهلة تحميل Google Maps'));
        }, 15000);
      });

      // انتظار قليل للتأكد من تحميل كل شيء
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (window.google && window.google.maps) {
        initializeMap();
      } else {
        throw new Error('Google Maps API غير متاح بعد التحميل');
      }
      
    } catch (error) {
      console.error('خطأ في تحميل Google Maps:', error);
      handleMapError();
    }
  };

  const initializeMap = () => {
    if (!mapRef.current) {
      console.error('حاوي الخريطة غير متاح');
      handleMapError();
      return;
    }

    if (!window.google || !window.google.maps) {
      console.error('Google Maps API غير متاح');
      handleMapError();
      return;
    }

    try {
      console.log('إنشاء خريطة Google Maps...');
      const defaultLocation = { lat: 30.0444, lng: 31.2357 }; // القاهرة
      
      const mapOptions = {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        zoomControl: true,
        disableDefaultUI: false,
        styles: [] // استخدام الستايل الافتراضي
      };
      
      const map = new window.google.maps.Map(mapRef.current, mapOptions);
      mapInstanceRef.current = map;
      console.log('تم إنشاء الخريطة بنجاح');

      // إنشاء علامة قابلة للسحب
      const marker = new window.google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: true,
        title: "اسحب لتحديد موقعك",
        animation: window.google.maps.Animation.DROP
      });
      
      markerRef.current = marker;
      setSelectedLocation(defaultLocation);
      console.log('تم إنشاء العلامة');

      // معالجة سحب العلامة
      marker.addListener('dragend', () => {
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

      // معالجة النقر على الخريطة
      map.addListener('click', (event: any) => {
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

      // معالجة تحميل الخريطة
      map.addListener('tilesloaded', () => {
        console.log('تم تحميل بلاطات الخريطة');
        setIsMapLoaded(true);
        setIsLoadingMap(false);
      });

      map.addListener('idle', () => {
        console.log('الخريطة في حالة استقرار');
        if (!isMapLoaded) {
          setIsMapLoaded(true);
          setIsLoadingMap(false);
        }
      });

      // محاولة الحصول على موقع المستخدم
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('تم الحصول على موقع المستخدم');
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
            // استخدام الموقع الافتراضي
            reverseGeocode(defaultLocation);
          },
          { 
            timeout: 10000, 
            enableHighAccuracy: true,
            maximumAge: 300000
          }
        );
      } else {
        reverseGeocode(defaultLocation);
      }

      // إجبار إعادة ضبط الحجم بعد التحميل
      setTimeout(() => {
        if (map && window.google) {
          window.google.maps.event.trigger(map, 'resize');
          map.setCenter(map.getCenter());
        }
      }, 1000);

    } catch (error) {
      console.error('خطأ في إنشاء الخريطة:', error);
      handleMapError();
    }
  };

  const reverseGeocode = (location: {lat: number, lng: number}) => {
    if (!window.google || !window.google.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { location: location },
      (results: any, status: string) => {
        if (status === 'OK' && results && results[0]) {
          setAddress(results[0].formatted_address);
          console.log('تم الحصول على العنوان:', results[0].formatted_address);
        } else {
          console.warn('فشل في الحصول على العنوان:', status);
        }
      }
    );
  };

  const handleMapError = () => {
    console.log('معالجة خطأ الخريطة');
    setMapError(true);
    setIsLoadingMap(false);
    setUseMap(false);
    toast({
      variant: "destructive",
      title: "خطأ في تحميل الخريطة",
      description: "سيتم استخدام التسجيل اليدوي بدلاً من ذلك"
    });
  };

  const handleSubmit = async () => {
    if (useMap && !selectedLocation) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى تحديد موقعك على الخريطة"
      });
      return;
    }

    if (!useMap && (!locationValue.governorate || !locationValue.city || !locationValue.area)) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى اختيار المحافظة والمدينة والمنطقة"
      });
      return;
    }

    if (!address.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى كتابة تفاصيل العنوان"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (user) {
        const addressData = {
          address,
          user_id: user.id,
          governorate_id: locationValue.governorate || null,
          city_id: locationValue.city || null,
          area_id: locationValue.area || null,
          neighborhood_id: locationValue.neighborhood || null,
          latitude: selectedLocation?.lat || null,
          longitude: selectedLocation?.lng || null,
          is_default: true
        };

        const { error } = await supabase
          .from('customer_addresses')
          .insert(addressData);

        if (error) throw error;

        await supabase
          .from('customers')
          .update({
            address: address,
            governorate_id: locationValue.governorate || null,
            city_id: locationValue.city || null,
            area_id: locationValue.area || null,
            neighborhood_id: locationValue.neighborhood || null
          })
          .eq('user_id', user.id);
      }

      localStorage.setItem('userAddress', address);
      localStorage.setItem('addressRegistered', 'true');

      toast({
        title: "تم تسجيل العنوان",
        description: "تم حفظ عنوانك بنجاح"
      });

      navigate('/');
    } catch (error) {
      console.error('خطأ في حفظ العنوان:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ العنوان"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm p-4">
          <div className="flex items-center">
            <MapPin className="text-primary mr-3" size={24} />
            <h1 className="text-xl font-bold">تسجيل عنوان التوصيل</h1>
          </div>
          <p className="text-gray-600 mt-2 text-sm">
            يرجى تحديد عنوانك لبدء التسوق والحصول على خدمة التوصيل
          </p>
        </div>

        <div className="p-4">
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex gap-4">
              <Button
                variant={useMap ? "default" : "outline"}
                onClick={() => {
                  setUseMap(true);
                  setMapError(false);
                }}
                className="flex-1"
                disabled={isLoadingMap}
              >
                <MapPin size={18} className="ml-2" />
                استخدام الخريطة
              </Button>
              <Button
                variant={!useMap ? "default" : "outline"}
                onClick={() => setUseMap(false)}
                className="flex-1"
              >
                <Navigation size={18} className="ml-2" />
                تسجيل يدوي
              </Button>
            </div>
            
            {mapError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  فشل في تحميل الخريطة. يرجى استخدام التسجيل اليدوي أو المحاولة مرة أخرى.
                </p>
              </div>
            )}
          </div>

          {useMap && !mapError && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <MapPin size={18} className="ml-2 text-primary" />
                حدد موقعك على الخريطة
              </h3>
              
              <div className="relative">
                <div 
                  ref={mapRef} 
                  className="w-full rounded-lg border overflow-hidden"
                  style={{ 
                    height: '400px',
                    minHeight: '400px',
                    backgroundColor: '#f9f9f9'
                  }}
                />
                
                {(isLoadingMap || !isMapLoaded) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-gray-600 text-sm">
                        جاري تحميل الخريطة...
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedLocation && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">العنوان المحدد:</p>
                  <p className="text-sm text-gray-800 font-medium">
                    {address || "جاري تحديد العنوان..."}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    الإحداثيات: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          )}

          {(!useMap || mapError) && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Navigation size={18} className="ml-2 text-primary" />
                اختر موقعك يدوياً
              </h3>
              <LocationPicker value={locationValue} onChange={setLocationValue} />
            </div>
          )}

          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">تفاصيل العنوان</h3>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-right"
              placeholder="مثال: الشارع، رقم المبنى، الطابق، رقم الشقة..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingMap}
            className="w-full bg-primary text-white py-3 text-lg"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Check size={20} className="ml-2" />
                تأكيد وحفظ العنوان
              </>
            )}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default AddressRegistration;