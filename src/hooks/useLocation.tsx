
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported', loading: false }));
      return;
    }

    const savedLat = localStorage.getItem('userLatitude');
    const savedLng = localStorage.getItem('userLongitude');
    
    if (savedLat && savedLng) {
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
    }

    // Always try to get current location regardless of saved coordinates
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        localStorage.setItem('userLatitude', latitude.toString());
        localStorage.setItem('userLongitude', longitude.toString());
        setLocation({
          latitude,
          longitude,
          error: null,
          loading: false
        });
        console.log('Location updated:', latitude, longitude);
        
        // If user is logged in, update the location in the database
        if (user) {
          updateLocationInDatabase(latitude, longitude);
        }
      },
      (error) => {
        console.error('Location error:', error);
        // Only update error if we don't have saved coordinates
        if (!savedLat || !savedLng) {
          setLocation(prev => ({
            ...prev,
            error: error.message,
            loading: false
          }));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [user]);
  
  const updateLocationInDatabase = async (latitude: number, longitude: number) => {
    if (!user) return;
    
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
