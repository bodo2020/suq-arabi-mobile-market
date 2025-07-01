
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';

interface AddressGuardProps {
  children: React.ReactNode;
}

const AddressGuard: React.FC<AddressGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [hasAddress, setHasAddress] = useState<boolean | null>(null);

  useEffect(() => {
    checkAddressRegistration();
  }, [user]);

  const checkAddressRegistration = async () => {
    try {
      // Check localStorage first for quick access
      const localAddress = localStorage.getItem('userAddress');
      const addressRegistered = localStorage.getItem('addressRegistered');
      
      if (localAddress && addressRegistered === 'true') {
        setHasAddress(true);
        return;
      }

      // If user is logged in, check database
      if (user) {
        const { data, error } = await supabase
          .from('customer_addresses')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error checking addresses:', error);
          setHasAddress(false);
          return;
        }

        if (data && data.length > 0) {
          setHasAddress(true);
          localStorage.setItem('addressRegistered', 'true');
        } else {
          setHasAddress(false);
        }
      } else {
        // For non-logged users, check localStorage only
        setHasAddress(!!localAddress);
      }
    } catch (error) {
      console.error('Error in address check:', error);
      setHasAddress(false);
    }
  };

  useEffect(() => {
    if (hasAddress === false) {
      navigate('/address-registration');
    }
  }, [hasAddress, navigate]);

  // Show loading while checking
  if (hasAddress === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600">جاري التحقق من العنوان...</p>
        </div>
      </div>
    );
  }

  // Only render children if address is registered
  return hasAddress ? <>{children}</> : null;
};

export default AddressGuard;
