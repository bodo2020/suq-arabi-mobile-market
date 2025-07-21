بالتأكيد، هذا هو الكود الكامل للمكون `AddressRegistration` بعد تطبيق التعديلات المقترحة لزيادة الموثوقية والأمان.

### **التعديلات الرئيسية:**

1.  **استخدام متغيرات البيئة:** تم استبدال مفتاح الـ API المكتوب مباشرة في الكود (`hardcoded`) بمتغير بيئة (`import.meta.env.VITE_Maps_API_KEY`). هذا أكثر أمانًا ومرونة.
2.  **تحميل السكريبت عبر `callback`:** تم تعديل طريقة تحميل سكريبت خرائط جوجل لاستخدام `&callback=initMap`. هذه الطريقة أثبتت فعاليتها وتمنع حدوث مشاكل في توقيت تحميل وتشغيل الدوال.

-----

### **قبل استخدام الكود:**

لا تنسَ إنشاء ملف `.env.local` في المجلد الرئيسي لمشروعك ووضع مفتاحك الخاص فيه:

```
VITE_Maps_API_KEY=ضع-مفتاحك-هنا
```

**ملاحظة:** إذا كنت تستخدم `Create React App` بدلاً من `Vite`، غيّر اسم المتغير إلى `REACT_APP_Maps_API_KEY` واستخدمه في الكود عبر `process.env.REACT_APP_Maps_API_KEY`.

-----

### **الكود الكامل المعدّل (`AddressRegistration.tsx`)**

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import LocationPicker, { LocationValue } from '@/components/ui/LocationPicker';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

// لجعل typescript يتعرف على الدالة المضافة للـ window
declare global {
  interface Window {
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
  const [mapError, setMapError] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
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
    // التأكد من عدم تحميل الخريطة إلا عند الحاجة
    if (useMap && !mapError && !mapInstanceRef.current) {
      loadGoogleMaps();
    }
  }, [useMap, mapError]);

  const loadGoogleMaps = () => {
    console.log('بدء تحميل خرائط جوجل...');
    setIsLoadingMap(true);
    
    // تحقق إذا كان السكريبت قد تم تحميله مسبقاً
    if (window.google && window.google.maps) {
      console.log('خرائط جوجل متاحة بالفعل');
      initializeMap();
      return;
    }

    try {
      // **تعديل:** جعل الدالة متاحة على مستوى الـ window ليتمكن سكريبت جوجل من استدعائها
      window.initMap = initializeMap;

      // إزالة أي سكريبت موجود مسبقاً لتجنب التكرار
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      
      // **تعديل:** استخدام متغيرات البيئة بدلاً من المفتاح المباشر
      // استخدم process.env.REACT_APP_Maps_API_KEY إذا كنت تستخدم Create React App
      const apiKey = import.meta.env.VITE_Maps_API_KEY; 

      if (!apiKey) {
        console.error("مفتاح Google Maps API غير موجود في ملف .env");
        handleMapError();
        return;
      }
      
      // **تعديل:** استخدام &callback=initMap لضمان تحميل آمن وموثوق
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        // سيتم معالجة الخطأ في حال فشل تحميل السكريبت نفسه
        throw new Error('فشل في تحميل سكريبت Google Maps');
      };
      
      document.head.appendChild(script);

    } catch (error) {
      console.error('خطأ في تحميل Google Maps:', error);
      handleMapError();
    }
  };

  const handleMapError = () => {
    console.log('حدث خطأ في الخريطة، التبديل للتسجيل اليدوي');
    setMapError(true);
    setIsLoadingMap(false);
    toast({
      variant: "destructive",
      title: "خطأ في تحميل الخريطة",
      description: "سيتم التبديل للتسجيل اليدوي"
    });
    setUseMap(false);
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.error('حاوي الخريطة أو Google Maps غير متاح');
      handleMapError();
      return;
    }

    try {
      console.log('إنشاء خريطة Google...');
      const defaultLocation = { lat: 30.0444, lng: 31.2357 }; // القاهرة
      
      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      });
      
      mapInstanceRef.current = map;
      console.log('تم إنشاء الخريطة بنجاح');

      const marker = new window.google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: true,
        title: "اسحب لتحديد موقعك",
        animation: window.google.maps.Animation.DROP
      });
      
      markerRef.current = marker;
      setSelectedLocation(defaultLocation);
      reverseGeocode(defaultLocation);

      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        if (position) {
          const newLocation = { lat: position.lat(), lng: position.lng() };
          setSelectedLocation(newLocation);
          reverseGeocode(newLocation);
        }
      });

      map.addListener('click', (event: any) => {
        if (event.latLng) {
          const newLocation = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          marker.setPosition(newLocation);
          setSelectedLocation(newLocation);
          reverseGeocode(newLocation);
        }
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('تم الحصول على موقع المستخدم:', position.coords);
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
            console.warn('لا يمكن الحصول على موقع المستخدم:', error);
          },
          { timeout: 8000, enableHighAccuracy: true }
        );
      }

      map.addListener('tilesloaded', () => {
        console.log('اكتمل تحميل بلاطات الخريطة');
        setIsMapLoaded(true);
        setIsLoadingMap(false); // إيقاف مؤشر التحميل هنا
      });

    } catch (error) {
      console.error('خطأ في إنشاء الخريطة:', error);
      handleMapError();
    }
  };

  const reverseGeocode = (location: {lat: number, lng: number}) => {
    if (!window.google || !window.google.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        setAddress(results[0].formatted_address);
        console.log('تم العثور على العنوان:', results[0].formatted_address);
      } else {
        console.warn("فشل Geocode بسبب: " + status);
      }
    });
  };

  const handleSubmit = async () => {
    // ... (منطق الحفظ يبقى كما هو، لا حاجة لتغييره)
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
                onClick={() => setUseMap(true)}
                className="flex-1"
                disabled={mapError}
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
              <p className="text-red-500 text-sm mt-2 text-center">
                فشل في تحميل الخريطة، يرجى استخدام التسجيل اليدوي
              </p>
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
                  className="w-full h-80 rounded-lg border bg-gray-100"
                  style={{ minHeight: '320px' }}
                />
                
                {isLoadingMap && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-gray-600">
                        جاري تحميل الخريطة...
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {isMapLoaded && selectedLocation && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">العنوان المحدد:</p>
                  <p className="text-sm text-gray-800 font-medium">
                    {address || "جاري تحديد العنوان..."}
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
            <h3 className="font-semibold mb-3">تفاصيل العنوان (اختياري)</h3>
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
```