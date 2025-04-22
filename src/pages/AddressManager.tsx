
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Plus, Trash2, Home } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import LocationPicker from "@/components/ui/LocationPicker";

interface Address {
  id: string;
  address: string;
  governorate_id?: string | null;
  city_id?: string | null;
  area_id?: string | null;
  neighborhood_id?: string | null;
  is_default: boolean;
  governorate_name?: string;
  city_name?: string;
  area_name?: string;
  neighborhood_name?: string;
}

const AddressManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLocation, setNewLocation] = useState<{
    government?: string; 
    city?: string; 
    area?: string; 
    neighborhood?: string
  }>({});
  const [governoratesData, setGovernoratesData] = useState<{[key: string]: string}>({});
  const [citiesData, setCitiesData] = useState<{[key: string]: string}>({});
  const [areasData, setAreasData] = useState<{[key: string]: string}>({});
  const [neighborhoodsData, setNeighborhoodsData] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/account/register');
        return;
      }
      setUserId(user.id);

      // Load addresses
      const { data: addressesData, error: addressesError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (addressesError) {
        console.error('Error loading addresses:', addressesError);
        return;
      }

      // Load location data
      const promises = [
        supabase.from('governorates').select('id, name'),
        supabase.from('cities').select('id, name'),
        supabase.from('areas').select('id, name'),
        supabase.from('neighborhoods').select('id, name')
      ];

      const [
        { data: governorates }, 
        { data: cities }, 
        { data: areas }, 
        { data: neighborhoods }
      ] = await Promise.all(promises);

      // Convert to lookup objects
      const govMap: {[key: string]: string} = {};
      const cityMap: {[key: string]: string} = {};
      const areaMap: {[key: string]: string} = {};
      const neighborhoodMap: {[key: string]: string} = {};

      governorates?.forEach(item => govMap[item.id] = item.name);
      cities?.forEach(item => cityMap[item.id] = item.name);
      areas?.forEach(item => areaMap[item.id] = item.name);
      neighborhoods?.forEach(item => neighborhoodMap[item.id] = item.name);

      setGovernoratesData(govMap);
      setCitiesData(cityMap);
      setAreasData(areaMap);
      setNeighborhoodsData(neighborhoodMap);

      // Enhance addresses with location names
      const enhancedAddresses = addressesData?.map(address => ({
        ...address,
        governorate_name: address.governorate_id ? govMap[address.governorate_id] : '',
        city_name: address.city_id ? cityMap[address.city_id] : '',
        area_name: address.area_id ? areaMap[address.area_id] : '',
        neighborhood_name: address.neighborhood_id ? neighborhoodMap[address.neighborhood_id] : ''
      })) || [];

      setAddresses(enhancedAddresses);

      // Store the selected area and neighborhood in localStorage for use on the main page
      if (enhancedAddresses.length > 0) {
        const defaultAddress = enhancedAddresses.find(a => a.is_default) || enhancedAddresses[0];
        localStorage.setItem('userArea', defaultAddress.area_name || '');
        localStorage.setItem('userNeighborhood', defaultAddress.neighborhood_name || '');
        localStorage.setItem('userAddress', defaultAddress.address || '');
      }
    };

    loadData();
  }, [navigate]);

  const handleBack = () => {
    navigate('/account');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSubmitting(true);

    try {
      // If this is the first address, set it as default
      const isDefault = addresses.length === 0;

      const { data, error } = await supabase
        .from('customer_addresses')
        .insert({
          user_id: userId,
          address: newAddress,
          governorate_id: newLocation.government || null,
          city_id: newLocation.city || null,
          area_id: newLocation.area || null,
          neighborhood_id: newLocation.neighborhood || null,
          is_default: isDefault
        })
        .select('*')
        .single();

      if (error) throw error;

      // Add the location names to the new address
      const enhancedAddress = {
        ...data,
        governorate_name: data.governorate_id ? governoratesData[data.governorate_id] : '',
        city_name: data.city_id ? citiesData[data.city_id] : '',
        area_name: data.area_id ? areasData[data.area_id] : '',
        neighborhood_name: data.neighborhood_id ? neighborhoodsData[data.neighborhood_id] : ''
      };

      setAddresses([...addresses, enhancedAddress]);
      setShowNewAddressForm(false);
      setNewAddress('');
      setNewLocation({});

      toast({
        title: "تم إضافة العنوان",
        description: "تم إضافة العنوان بنجاح",
      });

      // If this is the first address or set as default, update localStorage
      if (isDefault) {
        localStorage.setItem('userArea', enhancedAddress.area_name || '');
        localStorage.setItem('userNeighborhood', enhancedAddress.neighborhood_name || '');
        localStorage.setItem('userAddress', enhancedAddress.address || '');
      }
    } catch (error) {
      console.error('Error adding address:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة العنوان",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      setAddresses(updatedAddresses);

      toast({
        title: "تم حذف العنوان",
        description: "تم حذف العنوان بنجاح",
      });

      // If we deleted the default address, make another one default if available
      const deletedAddress = addresses.find(addr => addr.id === addressId);
      if (deletedAddress?.is_default && updatedAddresses.length > 0) {
        await setDefaultAddress(updatedAddresses[0].id);
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف العنوان",
        variant: "destructive",
      });
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    try {
      // First, remove default status from all addresses
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set the selected address as default
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      // Update the local state
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        is_default: addr.id === addressId
      }));

      setAddresses(updatedAddresses);

      // Update localStorage with the new default address information
      const defaultAddress = updatedAddresses.find(addr => addr.id === addressId);
      if (defaultAddress) {
        localStorage.setItem('userArea', defaultAddress.area_name || '');
        localStorage.setItem('userNeighborhood', defaultAddress.neighborhood_name || '');
        localStorage.setItem('userAddress', defaultAddress.address || '');
      }

      toast({
        title: "تم تحديث العنوان الافتراضي",
        description: "تم تحديث العنوان الافتراضي بنجاح",
      });
    } catch (error) {
      console.error('Error setting default address:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث العنوان الافتراضي",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="py-4">
        <div className="flex items-center mb-6">
          <button onClick={handleBack} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">عناوين التوصيل</h1>
          <div className="w-10"></div>
        </div>

        {/* Address List */}
        {addresses.length > 0 ? (
          <div className="space-y-3 mb-4">
            {addresses.map(address => (
              <div key={address.id} className={`bg-white rounded-lg p-4 border ${address.is_default ? 'border-primary' : 'border-gray-200'}`}>
                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleDeleteAddress(address.id)}
                      className="text-red-500 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                    {!address.is_default && (
                      <button 
                        onClick={() => setDefaultAddress(address.id)}
                        className="text-primary p-1"
                      >
                        تعيين كافتراضي
                      </button>
                    )}
                  </div>
                  <div className="flex items-start">
                    {address.is_default && (
                      <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded ml-2">
                        افتراضي
                      </span>
                    )}
                    <MapPin size={18} className="ml-2 mt-0.5 text-gray-500" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-sm font-medium mb-1">
                    {address.governorate_name && address.city_name && (
                      <div>{`${address.governorate_name}، ${address.city_name}`}</div>
                    )}
                    {address.area_name && address.neighborhood_name && (
                      <div>{`${address.area_name}، ${address.neighborhood_name}`}</div>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{address.address}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 text-center mb-4">
            <MapPin size={32} className="mx-auto mb-3 text-gray-400" />
            <h3 className="font-medium mb-2">لا توجد عناوين محفوظة</h3>
            <p className="text-gray-500 text-sm mb-4">يمكنك إضافة عنوان جديد للتوصيل</p>
          </div>
        )}

        {/* Add Address Button */}
        {!showNewAddressForm && (
          <button
            onClick={() => setShowNewAddressForm(true)}
            className="w-full bg-white border border-primary text-primary py-3 rounded-lg flex items-center justify-center"
          >
            <Plus size={18} className="ml-2" />
            إضافة عنوان جديد
          </button>
        )}

        {/* New Address Form */}
        {showNewAddressForm && (
          <form onSubmit={handleAddAddress} className="bg-white border border-primary/20 rounded-lg p-4 mb-4 space-y-3">
            <div>
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label className="font-medium">الموقع</label>
              </div>
              <LocationPicker value={newLocation} onChange={setNewLocation} />
            </div>
            <div>
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="newAddress" className="font-medium">تفاصيل العنوان</label>
              </div>
              <textarea
                id="newAddress"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل تفاصيل العنوان - الشارع، رقم المبنى، الطابق، الخ."
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="mr-2 text-gray-500"
                onClick={() => setShowNewAddressForm(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-primary text-white py-2 px-5 rounded-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block"></div>
                ) : (
                  'حفظ العنوان'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
};

export default AddressManager;
