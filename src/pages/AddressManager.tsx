
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { MapPin, Plus, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase, Address } from '@/lib/supabase';
import LocationPicker from "@/components/ui/LocationPicker";

type AddressWithNames = Address;

const AddressManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<AddressWithNames[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('customer_addresses')
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .eq('user_id', sessionData.session.user.id)
        .order('is_default', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل العناوين"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        return;
      }
      
      // First, set all addresses to non-default
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', sessionData.session.user.id);
      
      // Then set the selected address as default
      await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', addressId);
      
      // Update address in localStorage
      const selectedAddress = addresses.find(addr => addr.id === addressId);
      if (selectedAddress) {
        localStorage.setItem('userAddress', selectedAddress.address || '');
        localStorage.setItem('userArea', selectedAddress.areas?.name || '');
        localStorage.setItem('userNeighborhood', selectedAddress.neighborhoods?.name || '');
      }
      
      toast({
        title: "تم تحديث العنوان الافتراضي",
        description: "تم تعيين العنوان الافتراضي بنجاح"
      });
      
      // Refresh the addresses list
      fetchAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تعيين العنوان الافتراضي"
      });
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        return;
      }
      
      await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', sessionData.session.user.id);
      
      toast({
        title: "تم حذف العنوان",
        description: "تم حذف العنوان بنجاح"
      });
      
      // Refresh the addresses list
      fetchAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء حذف العنوان"
      });
    }
  };

  const handleAddAddress = () => {
    navigate('/add-address');
  };
  
  const handleEditAddress = (addressId: string) => {
    navigate(`/edit-address/${addressId}`);
  };

  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="text-xl font-bold mb-6 text-center">عناوين التوصيل</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {addresses.length > 0 ? (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div 
                    key={address.id} 
                    className={`bg-white p-4 rounded-lg shadow ${address.is_default ? 'border-2 border-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <MapPin size={16} className="ml-1 text-primary" />
                          <span className="font-medium">
                            {address.areas?.name || ''}
                            {address.neighborhoods?.name ? ` - ${address.neighborhoods?.name}` : ''}
                          </span>
                          {address.is_default && (
                            <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              العنوان الافتراضي
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{address.address}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={() => handleEditAddress(address.id)} 
                            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full"
                          >
                            تعديل
                          </button>
                          {!address.is_default && (
                            <>
                              <button 
                                onClick={() => handleSetDefault(address.id)} 
                                className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1 rounded-full"
                              >
                                تعيين كافتراضي
                              </button>
                              <button 
                                onClick={() => handleDeleteAddress(address.id)} 
                                className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full"
                              >
                                حذف
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Home size={40} className="mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">لا توجد عناوين محفوظة</p>
                <p className="text-gray-400 text-sm">أضف عنوانًا جديدًا للتوصيل</p>
              </div>
            )}
            
            <button 
              onClick={handleAddAddress}
              className="w-full mt-6 flex items-center justify-center bg-primary text-white p-3 rounded-lg"
            >
              <Plus size={18} className="ml-2" />
              إضافة عنوان جديد
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default AddressManager;
