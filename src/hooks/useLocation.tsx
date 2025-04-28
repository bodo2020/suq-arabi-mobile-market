
import { useState, useEffect } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    const savedLat = localStorage.getItem('userLatitude');
    const savedLng = localStorage.getItem('userLongitude');
    
    if (savedLat && savedLng) {
      setLocation({
        latitude: parseFloat(savedLat),
        longitude: parseFloat(savedLng),
        error: null
      });
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        localStorage.setItem('userLatitude', latitude.toString());
        localStorage.setItem('userLongitude', longitude.toString());
        setLocation({
          latitude,
          longitude,
          error: null
        });
        console.log('Location updated:', latitude, longitude);
      },
      (error) => {
        setLocation(prev => ({
          ...prev,
          error: error.message
        }));
        console.error('Location error:', error);
      }
    );
  }, []);

  return location;
};
