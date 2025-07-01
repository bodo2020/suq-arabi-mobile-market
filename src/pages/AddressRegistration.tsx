
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import LocationPicker, { LocationValue } from '@/components/ui/LocationPicker';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

const AddressRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  const [useMap, setUseMap] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
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
    if (useMap) {
      loadGoogleMaps();
    }
  }, [useMap]);

  const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.google && window.google.maps) {
          initializeMap();
        }
      }, 100);
    };
    script.onerror = () => {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في تحميل الخريطة. سيتم التبديل للتسجيل اليدوي"
      });
      setUseMap(false);
    };
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    try {
      const defaultLocation = { lat: 30.0444, lng: 31.2357 };
      
      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });
      
      mapInstanceRef.current = map;

      // Create draggable marker
      const marker = new window.google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: true,
        title: "اسحب لتحديد موقعك"
      });
      
      markerRef.current = marker;
      setSelectedLocation(defaultLocation);

      // Handle marker drag
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

      // Handle map click
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

      // Try to get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
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
            console.log('Could not get user location:', error);
          }
        );
      }

      setIsMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      setUseMap(false);
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
        }
      }
    );
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
      console.error('Error saving address:', error);
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
        {/* Header */}
        <div className="bg-white shadow-sm p-4">
          <div className="flex items-center">
            <MapPin className="text-primary mr-3" size={24} />
            <h1 className="text-xl font-bold">تسجيل عنوان التوصيل</h1>
          </div>
          <p className="text-gray-600 mt-2 text-sm">
            يرجى تحديد عنوانك لبدء التسوق والحصول على خدمة التوصيل
          </p>
        </div>

        {/* Toggle between map and manual */}
        <div className="p-4">
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex gap-4">
              <Button
                variant={useMap ? "default" : "outline"}
                onClick={() => setUseMap(true)}
                className="flex-1"
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
          </div>

          {/* Map Section */}
          {useMap && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <MapPin size={18} className="ml-2 text-primary" />
                حدد موقعك على الخريطة
              </h3>
              <div className="relative">
                <div 
                  ref={mapRef} 
                  className="w-full h-80 rounded-lg border"
                  style={{ minHeight: '320px' }}
                />
                
                {!isMapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-gray-600">جاري تحميل الخريطة...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedLocation && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    الإحداثيات: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Location Selection */}
          {!useMap && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Navigation size={18} className="ml-2 text-primary" />
                اختر موقعك يدوياً
              </h3>
              <LocationPicker value={locationValue} onChange={setLocationValue} />
            </div>
          )}

          {/* Address Details */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">تفاصيل العنوان</h3>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-right"
              placeholder="أدخل تفاصيل عنوانك (الشارع، رقم المبنى، الطابق، رقم الشقة...)"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
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
