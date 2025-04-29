
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import LocationMap from '@/components/ui/LocationMap';
import LocationPicker from '@/components/ui/LocationPicker';
import Script from '@/components/ui/Script';
// Import types correctly with .d.ts extension
import '@/types/google-maps.d.ts';

const Address = () => {
  const navigate = useNavigate();
  const { id: addressId } = useParams();
  const { toast } = useToast();
  const { user } = useUser();
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{
    government?: string; 
    city?: string; 
    area?: string; 
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
  }>({});
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [addressFromMap, setAddressFromMap] = useState('');

  useEffect(() => {
    // Load saved address if any
    const fetchAddress = async () => {
      if (addressId && user) {
        try {
          const { data, error } = await supabase
            .from('customer_addresses')
            .select(`
              *,
              governorates(id, name),
              cities(id, name),
              areas(id, name),
              neighborhoods(id, name)
            `)
            .eq('id', addressId)
            .eq('user_id', user.id)
            .single();

          if (error) {
            throw error;
          }

          if (data) {
            setAddress(data.address || '');
            setLocation({
              government: data.governorate_id || undefined,
              city: data.city_id || undefined,
              area: data.area_id || undefined,
              neighborhood: data.neighborhood_id || undefined,
              // Cast latitude and longitude to numbers if they exist
              latitude: data.latitude ? Number(data.latitude) : undefined,
              longitude: data.longitude ? Number(data.longitude) : undefined
            });
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          toast({
            variant: "destructive",
            title: "خطأ",
            description: "حدث خطأ أثناء تحميل العنوان"
          });
        }
      } else {
        // Load saved address from localStorage if no addressId
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) {
          setAddress(savedAddress);
        }
      }
    };

    fetchAddress();
  }, [addressId, user, toast]);

  const handleBack = () => {
    navigate(-1);
  };

  const validate = () => {
    if (!address.trim()) {
      setError('العنوان مطلوب');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (user) {
        // If logged in, save to database
        const addressData = {
          address,
          user_id: user.id,
          governorate_id: location.government || null,
          city_id: location.city || null,
          area_id: location.area || null,
          neighborhood_id: location.neighborhood || null,
          latitude: location.latitude || null,
          longitude: location.longitude || null,
          is_default: false // Don't automatically set as default
        };

        let result;
        if (addressId) {
          // Update existing address
          result = await supabase
            .from('customer_addresses')
            .update(addressData)
            .eq('id', addressId)
            .eq('user_id', user.id);
        } else {
          // Create new address
          result = await supabase
            .from('customer_addresses')
            .insert(addressData)
            .select();
        }

        if (result.error) {
          throw result.error;
        }

        // Store in localStorage for quick access
        localStorage.setItem('userAddress', address);

        if (location.area) {
          const { data: areaData } = await supabase
            .from('areas')
            .select('name')
            .eq('id', location.area)
            .single();

          if (areaData?.name) {
            localStorage.setItem('userArea', areaData.name);
          }
        }

        if (location.neighborhood) {
          const { data: neighborhoodData } = await supabase
            .from('neighborhoods')
            .select('name')
            .eq('id', location.neighborhood)
            .single();

          if (neighborhoodData?.name) {
            localStorage.setItem('userNeighborhood', neighborhoodData.name);
          }
        }

        toast({
          title: addressId ? "تم تحديث العنوان" : "تم إضافة العنوان",
          description: addressId ? "تم تحديث العنوان بنجاح" : "تم إضافة العنوان بنجاح"
        });

      } else {
        // For non-logged in users, just store in localStorage
        localStorage.setItem('userAddress', address);
      }

      navigate(-1);
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

  const handleLocationSelect = (lat: number, lng: number, addressText: string) => {
    setLocation(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
    
    // Optionally update address text if it's empty or if user wants to use the geocoded address
    if (!address || addressFromMap !== addressText) {
      setAddressFromMap(addressText);
    }
  };

  const handleUseMapAddress = () => {
    if (addressFromMap) {
      setAddress(addressFromMap);
    }
  };

  return (
    <MainLayout>
      <Script 
        src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyCkV_5RhFvcX-kXdGh5IsIZzwexnvrx6Fw&libraries=places`}
        onLoad={() => setMapsLoaded(true)} 
      />
      
      <div className="py-4">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">عنوان التوصيل</h1>
          <div className="w-10"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label className="font-medium">الموقع</label>
              </div>
              <LocationPicker value={location} onChange={setLocation} />
            </div>

            {mapsLoaded && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <MapPin size={18} className="ml-2 text-gray-500" />
                    <label className="font-medium">تحديد الموقع من الخريطة</label>
                  </div>
                </div>
                <LocationMap 
                  onLocationSelect={handleLocationSelect}
                  initialLat={location.latitude}
                  initialLng={location.longitude}
                  addressId={addressId}
                />
                {addressFromMap && (
                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-sm text-gray-600 truncate flex-1">{addressFromMap}</div>
                    <button
                      type="button"
                      onClick={handleUseMapAddress}
                      className="text-xs text-primary hover:underline"
                    >
                      استخدام هذا العنوان
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-2">
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="address" className="font-medium">تفاصيل العنوان</label>
              </div>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${error ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل عنوانك بالتفصيل"
                rows={3}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <p className="text-sm text-gray-500 mb-2">
              يرجى كتابة العنوان بالتفصيل، مثال: المدينة، الحي، الشارع، رقم المبنى، الطابق، رقم الشقة
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Check size={18} className="ml-2" />
                حفظ العنوان
              </>
            )}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default Address;
