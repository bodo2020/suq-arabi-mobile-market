import { customerRpc } from '@/lib/customerPersistence';
import { useUser } from '@/contexts/UserContext';
import { useQueryClient } from '@tanstack/react-query';
import BrandLoader from '@/components/ui/BrandLoader';

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CheckoutLayout from '@/components/layout/CheckoutLayout';
import { MapPin, Plus, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase, Address } from '@/lib/supabase';

const AddressManager = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnToPayment = params.get('returnTo') === '/payment';
  const queryClient = useQueryClient();
  const { user, authLoading } = useUser();
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setAddresses([]);
    setLoading(true);
    if (!authLoading) void fetchAddresses();
  }, [user?.id, authLoading]);

  const fetchAddresses = async () => {
    const expectedUser = currentUser.current;
    setLoadError(false);
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
          governorates(id, name),
          cities(id, name),
          areas(id, name),
          neighborhoods(id, name)
        `)
        .eq('user_id', sessionData.session.user.id)
        .order('is_default', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (currentUser.current === expectedUser) setAddresses(data as Address[] || []);
    } catch (error) {
      if (currentUser.current === expectedUser) setLoadError(true);
      console.error('Error fetching addresses:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل العناوين"
      });
    } finally {
      if (currentUser.current === expectedUser) setLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "يجب تسجيل الدخول أولاً"
        });
        return;
      }
      
      const { error } = await customerRpc('set_default_customer_address', { p_address_id: addressId });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['customerData'] });

      // Update address info in localStorage
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
      
      // Check if this is the default address
      const addressToDelete = addresses.find(addr => addr.id === addressId);
      const isDefault = addressToDelete?.is_default || false;
      
      // Delete the address
      const { error: deleteError } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', sessionData.session.user.id);
      if (deleteError) throw deleteError;
      await queryClient.invalidateQueries({ queryKey: ['customerData'] });
      
      // If deleted the default address, need to set another as default
      if (isDefault && addresses.length > 1) {
        const remainingAddresses = addresses.filter(addr => addr.id !== addressId);
        if (remainingAddresses.length > 0) {
          await handleSetDefault(remainingAddresses[0].id);
        }
      }
      
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
    navigate(returnToPayment ? '/add-address?returnTo=%2Fpayment' : '/add-address');
  };
  
  const handleEditAddress = (addressId: string) => {
    navigate(`/edit-address/${addressId}${returnToPayment ? '?returnTo=%2Fpayment' : ''}`);
  };

  return (
    <CheckoutLayout step={2} showSteps={returnToPayment} backTo={returnToPayment ? '/payment' : '/account'} backLabel={returnToPayment ? 'رجوع للدفع' : 'رجوع للحساب'}>
      <div className="flex items-start justify-between gap-4 mb-6"><div><h1 className="checkout-title">عناوينك</h1><p className="checkout-intro">مكانك محفوظ، للطلب ده واللي بعده.</p></div></div>
      <div className="max-w-3xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <BrandLoader size="md" className="" />
          </div>
        ) : !user ? <section className="cart-empty"><h2 className="text-xl font-bold">عناوينك محفوظة في حسابك</h2><p>سجّل دخولك لإضافة عنوان أو تعديل عناوينك.</p><Button className="cart-primary" onClick={() => navigate('/phone-verify?returnTo=%2Faddresses')}>تسجيل الدخول</Button></section> : loadError ? <div className="cart-alert" role="alert">تعذر تحميل عناوينك.<Button variant="outline" onClick={fetchAddresses}>إعادة المحاولة</Button></div> : (
          <>
            {returnToPayment && <div className="mb-5 rounded-2xl bg-white p-4 border border-green-100"><h1 className="text-lg font-bold">عنوان طلبك</h1><p className="text-sm text-gray-600 mt-2">اختار عنوانك الافتراضي أو ضيف عنوان جديد، وبعدها كمّل الدفع.</p>{addresses.some(address => address.is_default) && <Button className="mt-4 w-full h-12 rounded-xl" onClick={() => navigate('/payment')}>متابعة للدفع</Button>}</div>}
            {addresses.length > 0 ? (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div 
                    key={address.id} 
                    className={`bg-white p-5 rounded-2xl border ${address.is_default ? 'border-2 border-primary' : ''}`}
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
                        
                        {address.latitude != null && address.longitude != null && <a href={`https://www.google.com/maps/search/?api=1&query=${Number(address.latitude)},${Number(address.longitude)}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-medium text-primary py-3 mb-2">عرض الموقع على Google Maps</a>}
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={() => handleEditAddress(address.id)} 
                            className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-xl"
                          >
                            تعديل
                          </button>
                          {!address.is_default && (
                            <>
                              <button 
                                onClick={() => handleSetDefault(address.id)} 
                                className="text-sm bg-green-50 text-green-800 hover:bg-green-100 px-4 py-3 rounded-xl"
                              >
                                تعيين كافتراضي
                              </button>
                              <button 
                                onClick={() => handleDeleteAddress(address.id)} 
                                className="text-sm bg-red-50 text-red-700 hover:bg-red-100 px-4 py-3 rounded-xl"
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
    </CheckoutLayout>
  );
};

export default AddressManager;

