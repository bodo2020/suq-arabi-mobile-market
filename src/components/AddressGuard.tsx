import React, { useEffect, useState } from 'react';
import AddressSelector from '@/components/ui/AddressSelector';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AddressGuardProps {
  children: React.ReactNode;
}

const AddressGuard: React.FC<AddressGuardProps> = ({ children }) => {
  const [hasAddress, setHasAddress] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAddress();
  }, []);

  const checkAddress = async () => {
    try {
      // First check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user has address in database
        const { data: addresses } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);
        
        if (addresses && addresses.length > 0) {
          setHasAddress(true);
          setLoading(false);
          return;
        }
      }
      
      // Fallback to localStorage check for non-authenticated users
      const savedAddress = localStorage.getItem('selectedAddress');
      if (savedAddress) {
        try {
          const parsedAddress = JSON.parse(savedAddress);
          if (parsedAddress.neighborhood_id) {
            setHasAddress(true);
          }
        } catch (error) {
          console.error('Error parsing saved address:', error);
        }
      }
    } catch (error) {
      console.error('Error checking address:', error);
    }
    
    setLoading(false);
  };

  const handleAddressSelect = (addressData: any) => {
    setHasAddress(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAddress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center shadow-lg">
          <div className="mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              اختر عنوان التوصيل
            </h2>
            <p className="text-gray-600">
              لتتمكن من استخدام التطبيق، يرجى اختيار عنوان التوصيل أولاً
            </p>
          </div>
          
          <AddressSelector
            onAddressSelect={handleAddressSelect}
          >
            <Button className="w-full">
              <MapPin className="w-4 h-4 ml-2" />
              اختر العنوان
            </Button>
          </AddressSelector>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AddressGuard;