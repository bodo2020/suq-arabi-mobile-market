
import React from 'react';
import SimpleMapPicker from '@/components/ui/SimpleMapPicker';

const SimpleMap = () => {
  // Default to Alexandria, Egypt coordinates
  const initialLocation = { lat: 31.2566, lng: 31.1671 };

  return (
    <SimpleMapPicker 
      initialLocation={initialLocation}
      showBackButton={true}
    />
  );
};

export default SimpleMap;
