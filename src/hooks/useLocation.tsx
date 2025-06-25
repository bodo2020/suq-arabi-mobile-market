
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true
  });
  const { toast } = useToast();
  const { user } = useUser();
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Set mounted ref to true when component mounts
    isMountedRef.current = true;
    
    // Function to handle getting the location from localStorage only
    const getStoredLocation = () => {
      const savedLat = localStorage.getItem('userLatitude') || localStorage.getItem('selectedLat');
      const savedLng = localStorage.getItem('userLongitude') || localStorage.getItem('selectedLng');
      
      if (savedLat && savedLng && isMountedRef.current) {
        setLocation({
          latitude: parseFloat(savedLat),
          longitude: parseFloat(savedLng),
          error: null,
          loading: false
        });
        
        // If user is logged in, update the location in the database
        if (user) {
          updateLocationInDatabase(parseFloat(savedLat), parseFloat(savedLng));
        }
      } else if (isMountedRef.current) {
        // No stored location available
        setLocation(prev => ({
          ...prev,
          error: "لم يتم تحديد موقع بعد",
          loading: false
        }));
      }
    };

    // Get stored location only
    getStoredLocation();

    // Cleanup function
    return () => {
      console.log("useLocation hook cleaning up");
      isMountedRef.current = false;
    };
  }, [user]);
  
  const updateLocationInDatabase = async (latitude: number, longitude: number) => {
    if (!user || !isMountedRef.current) return;
    
    try {
      // Get the JWT token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        console.error('No authentication token available');
        return;
      }
      
      // Call the edge function
      const response = await supabase.functions.invoke('update-location', {
        body: { latitude, longitude },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.error) {
        console.error('Error updating location in database:', response.error);
      }
    } catch (error) {
      console.error('Error calling update-location function:', error);
    }
  };

  return location;
};
