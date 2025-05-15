
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
  const watchIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  
  // Function to clean up geolocation watch
  const cleanupGeolocationWatch = () => {
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log("Geolocation watch cleared:", watchIdRef.current);
      } catch (e) {
        console.error("Error clearing geolocation watch:", e);
      }
      watchIdRef.current = null;
    }
  };

  useEffect(() => {
    // Set mounted ref to true when component mounts
    isMountedRef.current = true;
    
    // Function to handle getting the location
    const getLocation = () => {
      if (!navigator.geolocation) {
        setLocation(prev => ({ ...prev, error: 'Geolocation is not supported', loading: false }));
        return;
      }

      const savedLat = localStorage.getItem('userLatitude');
      const savedLng = localStorage.getItem('userLongitude');
      
      if (savedLat && savedLng) {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
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
      }

      // Always try to get current location regardless of saved coordinates
      try {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            // Only update state if component is still mounted
            if (!isMountedRef.current) return;
            
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
            // Only update state if component is still mounted
            if (!isMountedRef.current) return;
            
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
        
        // Store watch ID for cleanup
        watchIdRef.current = watchId;
      } catch (e) {
        console.error("Error setting up geolocation watch:", e);
        if (isMountedRef.current) {
          setLocation(prev => ({
            ...prev,
            error: e instanceof Error ? e.message : "Unknown error setting up location tracking",
            loading: false
          }));
        }
      }
    };

    // Start getting location
    getLocation();

    // Cleanup function to clear watch and prevent memory leaks
    return () => {
      console.log("useLocation hook cleaning up");
      isMountedRef.current = false;
      cleanupGeolocationWatch();
    };
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
