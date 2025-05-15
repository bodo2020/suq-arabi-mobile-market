import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowRight, Check, MapPin, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import LocationPicker from '@/components/ui/LocationPicker';
import Script from '@/components/ui/Script';
import '@/types/google-maps.d.ts';

const Address = () => {
  const navigate = useNavigate();
  const { id: addressId } = useParams();
  const { toast } = useToast();
  const { user } = useUser();
  const location = useLocation();
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mapLocation, setMapLocation] = useState<{
    government?: string; 
    city?: string; 
    area?: string; 
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
  }>({});
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [addressFromMap, setAddressFromMap] = useState('');

  // Check for location data in URL parameters (coming back from map view)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const lat = queryParams.get('lat');
    const lng = queryParams.get('lng');
    const mapAddress = queryParams.get('address');
    
    if (lat && lng && mapAddress) {
      // Save coordinates in local storage for persistence
      localStorage.setItem('selectedLat', lat);
      localStorage.setItem('selectedLng', lng);
      localStorage.setItem('selectedAddress', decodeURIComponent(mapAddress));
      
      // Update state with new coordinates
      setMapLocation(prev => ({
        ...prev,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      }));
      setAddressFromMap(decodeURIComponent(mapAddress));
      
      // Show success message
      toast({
        title: "تم تحديد الموقع",
        description: "تم تحديد موقعك بنجاح على الخريطة"
      });
    }
  }, [location.search, toast]);

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
            setMapLocation({
              government: data.governorate_id || undefined,
              city: data.city_id || undefined,
              area: data.area_id || undefined,
              neighborhood: data.neighborhood_id || undefined,
              latitude: data.latitude !== null ? Number(data.latitude) : undefined,
              longitude: data.longitude !== null ? Number(data.longitude) : undefined
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
          governorate_id: mapLocation.government || null,
          city_id: mapLocation.city || null,
          area_id: mapLocation.area || null,
          neighborhood_id: mapLocation.neighborhood || null,
          latitude: mapLocation.latitude || null,
          longitude: mapLocation.longitude || null,
          // Set as default if this is the user's first address
          is_default: addressId ? false : await isFirstAddress()
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

        // Store area and neighborhood names in customer profile for quick access
        await updateCustomerProfileWithAddress();

        // Store in localStorage for quick access
        localStorage.setItem('userAddress', address);

        if (mapLocation.area) {
          const { data: areaData } = await supabase
            .from('areas')
            .select('name')
            .eq('id', mapLocation.area)
            .single();

          if (areaData?.name) {
            localStorage.setItem('userArea', areaData.name);
          }
        }

        if (mapLocation.neighborhood) {
          const { data: neighborhoodData } = await supabase
            .from('neighborhoods')
            .select('name')
            .eq('id', mapLocation.neighborhood)
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

      navigate('/address-manager');
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

  // Helper function to check if this is the user's first address
  const isFirstAddress = async () => {
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error checking existing addresses:', error);
      return false;
    }
    
    return data.length === 0;
  };
  
  // Helper function to update customer profile with address details
  const updateCustomerProfileWithAddress = async () => {
    if (!user) return;
    
    try {
      const updateData: Record<string, any> = {
        address: address
      };
      
      if (mapLocation.government) {
        updateData.governorate_id = mapLocation.government;
      }
      
      if (mapLocation.city) {
        updateData.city_id = mapLocation.city;
      }
      
      if (mapLocation.area) {
        updateData.area_id = mapLocation.area;
      }
      
      if (mapLocation.neighborhood) {
        updateData.neighborhood_id = mapLocation.neighborhood;
      }
      
      await supabase
        .from('customers')
        .update(updateData)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating customer profile:', error);
      // Don't throw error as this is a non-critical operation
    }
  };

  const handleOpenMapView = () => {
    // Navigate to full map view with current location or saved coordinates
    const savedLat = localStorage.getItem('selectedLat');
    const savedLng = localStorage.getItem('selectedLng');
    
    const lat = mapLocation.latitude || (savedLat ? parseFloat(savedLat) : 30.0444);
    const lng = mapLocation.longitude || (savedLng ? parseFloat(savedLng) : 31.2357);
    
    navigate(`/map-view?lat=${lat}&lng=${lng}${addressId ? `&addressId=${addressId}` : ''}`);
  };

  const handleUseMapAddress = () => {
    if (addressFromMap) {
      setAddress(addressFromMap);
    }
  };

  return (
    <MainLayout>
      <Script 
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCkV_5RhFvcX-kXdGh5IsIZzwexnvrx6Fw&libraries=places"
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
              <LocationPicker value={mapLocation} onChange={setMapLocation} />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <MapPin size={18} className="ml-2 text-gray-500" />
                  <label className="font-medium">تحديد الموقع من الخريطة</label>
                </div>
              </div>
              
              <Button 
                onClick={handleOpenMapView} 
                variant="outline" 
                className="w-full flex justify-center items-center mb-3"
              >
                <MapIcon size={18} className="ml-2" />
                فتح الخريطة لتحديد موقعك بدقة
              </Button>
              
              {addressFromMap && (
                <div className="mt-2 flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600 truncate flex-1">
                    <div className="font-semibold mb-1">الإحداثيات: {mapLocation.latitude?.toFixed(6)}, {mapLocation.longitude?.toFixed(6)}</div>
                    <div>{addressFromMap}</div>
                  </div>
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
