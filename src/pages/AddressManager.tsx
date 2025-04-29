import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Plus, Trash2, Home } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase, Address } from '@/lib/supabase';
import LocationPicker from "@/components/ui/LocationPicker";

type AddressWithNames = Address;

const AddressManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<AddressWithNames[]>([]);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLocation, setNewLocation] = useState<{
    government?: string; 
    city?: string; 
    area?: string; 
    neighborhood?: string
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAddresses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/register');
        return;
      }
      setUserId(user.id);

      try {
        const { data: addressesData, error } = await supabase
          .from('customer_addresses')
          .select(`
            *,
            governorates(name),
            cities(name),
            areas(name),
            neighborhoods(name)
          `)
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (error) {
          console.error('Error loading addresses:', error);
          return;
        }

        setAddresses(addressesData || []);
        
        // Update localStorage with default address if available
        const defaultAddress = addressesData?.find(addr => addr.is_default);
        if (defaultAddress) {
          updateLocalStorageAddress(defaultAddress);
        }
      } catch (error) {
        console.error('Error in address fetch:', error);
      }
    };

    fetchAddresses();
  }, [navigate]);

  const updateLocalStorageAddress = (address: AddressWithNames) => {
    localStorage.setItem('userAddress', address.address || '');
    localStorage.setItem('userArea', address.areas?.name || '');
    localStorage.setItem('userNeighborhood', address.neighborhoods?.name || '');
  };

  const handleBack = () => {
    navigate('/account');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSubmitting(true);

    try {
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
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .single();

      if (error) throw error;

      if (isDefault) {
        updateLocalStorageAddress(data);
      }

      // Refresh the addresses list
      const { data: addressesData } = await supabase
        .from('customer_addresses')
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      setAddresses(addressesData || []);
      setShowNewAddressForm(false);
      setNewAddress('');
      setNewLocation({});

      toast({
        title: "تم إضافة العنوان",
        description: "تم إضافة العنوان بنجاح",
      });
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

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!userId) return;
    
    try {
      // First, update all addresses to not be default
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
      
      // Then, set the selected address as default
      await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      // Get the updated address with joined data
      const { data: updatedAddress } = await supabase
        .from('customer_addresses')
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .eq('id', addressId)
        .single();

      // Update local storage
      if (updatedAddress) {
        updateLocalStorageAddress(updatedAddress);
      }

      // Refresh the addresses list
      const { data: addressesData } = await supabase
        .from('customer_addresses')
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      setAddresses(addressesData || []);

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

  const handleEditAddress = (addressId: string) => {
    navigate(`/edit-address/${addressId}`);
  };

  return (
    <MainLayout>
      <div className="py-4">
        <div className="flex items-center mb-6">
          <button onClick={handleBack} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">عناوين التوصيل</h1>
        </div>

        {addresses.length > 0 ? (
          <div className="space-y-3 mb-4">
            {addresses.map(address => (
              <div key={address.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {address.governorates?.name && `${address.governorates.name}، `}
                      {address.cities?.name && `${address.cities.name}، `}
                      {address.areas?.name && `${address.areas.name}، `}
                      {address.neighborhoods?.name}
                    </span>
                    <span className="text-sm text-gray-600">{address.address}</span>
                    {address.latitude && address.longitude && (
                      <span className="text-xs text-gray-400">تم تحديد الموقع على الخريطة</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditAddress(address.id)}
                      className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleSetDefaultAddress(address.id)}
                      className={`text-xs px-2 py-1 rounded ${
                        address.is_default 
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {address.is_default ? 'افتراضي' : 'تعيين كافتراضي'}
                    </button>
                  </div>
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

        {!showNewAddressForm && (
          <button
            onClick={() => navigate('/add-address')}
            className="w-full bg-white border border-primary text-primary py-3 rounded-lg flex items-center justify-center"
          >
            <Plus size={18} className="ml-2" />
            إضافة عنوان جديد
          </button>
        )}
      </div>
    </MainLayout>
  );
};

export default AddressManager;
