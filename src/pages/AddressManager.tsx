import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Plus, Trash2, Home } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import LocationPicker from "@/components/ui/LocationPicker";
import { Address } from '@/lib/supabase';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAddresses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/account/register');
        return;
      }
      setUserId(user.id);

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

      const enhancedAddresses = addressesData.map(addr => ({
        ...addr,
        governorate_name: addr.governorates?.name,
        city_name: addr.cities?.name,
        area_name: addr.areas?.name,
        neighborhood_name: addr.neighborhoods?.name
      }));

      setAddresses(enhancedAddresses);
    };

    fetchAddresses();
  }, [navigate]);

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
        .select('*')
        .single();

      if (error) throw error;

      const { data: locationData, error: locationError } = await supabase
        .from('governorates')
        .select('name')
        .eq('id', data.governorate_id)
        .single();

      const enhancedAddress = {
        ...data,
        governorate_name: locationData?.name,
        city_name: '',
        area_name: '',
        neighborhood_name: ''
      };

      setAddresses([...addresses, enhancedAddress]);
      setShowNewAddressForm(false);
      setNewAddress('');
      setNewLocation({});

      toast({
        title: "تم إضافة العنوان",
        description: "تم إضافة العنوان بنجاح",
      });

      if (isDefault) {
        localStorage.setItem('userArea', enhancedAddress.area_name || '');
        localStorage.setItem('userNeighborhood', enhancedAddress.neighborhood_name || '');
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

  const formatAddressDisplay = (address: Address) => {
    if (!address) return '';
    
    let parts = [address.address];
    
    if (address.governorate_id) {
      parts.push(`المحافظة: ${address.governorate_id}`);
    }
    
    if (address.city_id) {
      parts.push(`المدينة: ${address.city_id}`);
    }
    
    if (address.area_id) {
      parts.push(`المنطقة: ${address.area_id}`);
    }
    
    if (address.neighborhood_id) {
      parts.push(`الحي: ${address.neighborhood_id}`);
    }
    
    return parts.join(', ');
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
                      {address.governorate_name && `${address.governorate_name}، `}
                      {address.city_name && `${address.city_name}، `}
                      {address.area_name && `${address.area_name}، `}
                      {address.neighborhood_name && `${address.neighborhood_name}`}
                    </span>
                    <span className="text-sm text-gray-600">{address.address}</span>
                  </div>
                  {address.is_default && (
                    <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                      افتراضي
                    </span>
                  )}
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
            onClick={() => setShowNewAddressForm(true)}
            className="w-full bg-white border border-primary text-primary py-3 rounded-lg flex items-center justify-center"
          >
            <Plus size={18} className="ml-2" />
            إضافة عنوان جديد
          </button>
        )}

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
                placeholder="أدخل تفاص��ل العنوان - الشارع، رقم المبنى، الطابق، الخ."
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
