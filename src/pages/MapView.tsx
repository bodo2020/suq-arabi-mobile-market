
import React from 'react';
import MapLocationPicker from '@/components/ui/MapLocationPicker';
import { useLocation } from 'react-router-dom';

const MapView: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const initialLat = parseFloat(queryParams.get('lat') || localStorage.getItem('userLatitude') || '30.0444');
  const initialLng = parseFloat(queryParams.get('lng') || localStorage.getItem('userLongitude') || '31.2357');

  return (
    <MapLocationPicker 
      initialLocation={{ lat: initialLat, lng: initialLng }}
      showBackButton={true}
    />
  );
};

export default MapView;
