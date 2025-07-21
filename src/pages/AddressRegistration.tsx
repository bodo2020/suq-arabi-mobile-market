import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import LocationPicker, { LocationValue } from '@/components/ui/LocationPicker';
import MapboxMap from '@/components/ui/MapboxMap';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

const AddressRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  
  const [useMap, setUseMap] = useState(true);
  const [mapboxToken, setMapboxToken] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [address, setAddress] = useState('');
  const [locationValue, setLocationValue] = useState<LocationValue>({
    governorate: "",
    city: "",
    area: "",
    neighborhood: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    setSelectedLocation(location);
    if (location.address) {
      setAddress(location.address);
    }
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

          {useMap && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <MapPin size={18} className="ml-2 text-primary" />
                حدد موقعك على الخريطة
              </h3>
              
              {!mapboxToken ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    لاستخدام الخريطة، يرجى إدخال Mapbox Access Token الخاص بك.
                    يمكنك الحصول عليه من <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">mapbox.com</a>
                  </p>
                  <Input
                    value={mapboxToken}
                    onChange={(e) => setMapboxToken(e.target.value)}
                    placeholder="أدخل Mapbox Access Token"
                    className="text-right"
                  />
                </div>
              ) : (
                <MapboxMap
                  accessToken={mapboxToken}
                  onLocationSelect={handleLocationSelect}
                />
              )}
              
              {selectedLocation && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">العنوان المحدد:</p>
                  <p className="text-sm text-gray-800 font-medium">
                    {address || "جاري تحديد العنوان..."}
                  </p>
                </div>
              )}
            </div>
          )}

          {!useMap && (
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