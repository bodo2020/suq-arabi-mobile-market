
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

interface GuestLocation {
  latitude: number;
  longitude: number;
  address: string;
  timestamp: string;
}

export const useGuestLocation = () => {
  const [guestLocation, setGuestLocation] = useState<GuestLocation | null>(null);
  const { user } = useUser();
  const { toast } = useToast();

  // Load guest location from localStorage
  useEffect(() => {
    const savedLocation = localStorage.getItem('guestLocation');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setGuestLocation(location);
      } catch (error) {
        console.error('Error parsing guest location:', error);
        localStorage.removeItem('guestLocation');
      }
    }
  }, []);

  // Migrate guest location to database when user logs in
  useEffect(() => {
    const migrateGuestLocation = async () => {
      if (!user || !guestLocation) return;

      try {
        // Check if user already has addresses
        const { data: existingAddresses } = await supabase
          .from('customer_addresses')
          .select('id')
          .eq('user_id', user.id);

        // Only migrate if user has no existing addresses
        if (!existingAddresses || existingAddresses.length === 0) {
          const { error } = await supabase
            .from('customer_addresses')
            .insert({
              user_id: user.id,
              address: guestLocation.address,
              latitude: guestLocation.latitude,
              longitude: guestLocation.longitude,
              is_default: true
            });

          if (error) {
            console.error('Error migrating guest location:', error);
          } else {
            toast({
              title: "تم نقل موقعك",
              description: "تم حفظ موقعك السابق إلى حسابك"
            });
            
            // Clear guest location after successful migration
            localStorage.removeItem('guestLocation');
            setGuestLocation(null);
          }
        } else {
          // Clear guest location if user already has addresses
          localStorage.removeItem('guestLocation');
          setGuestLocation(null);
        }
      } catch (error) {
        console.error('Error during location migration:', error);
      }
    };

    migrateGuestLocation();
  }, [user, guestLocation, toast]);

  const saveGuestLocation = (location: Omit<GuestLocation, 'timestamp'>) => {
    const locationWithTimestamp = {
      ...location,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('guestLocation', JSON.stringify(locationWithTimestamp));
    setGuestLocation(locationWithTimestamp);
  };

  const clearGuestLocation = () => {
    localStorage.removeItem('guestLocation');
    setGuestLocation(null);
  };

  return {
    guestLocation,
    saveGuestLocation,
    clearGuestLocation
  };
};
