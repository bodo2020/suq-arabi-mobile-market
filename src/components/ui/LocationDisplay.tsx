
import React from 'react';

interface LocationDisplayProps {
  area?: string | null;
  neighborhood?: string | null;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({ area, neighborhood }) => {
  if (!area && !neighborhood) return null;
  return (
    <div className="flex flex-col items-end mb-2 px-2">
      <span className="text-xs text-gray-500">
        التوصيل إلى  
        {neighborhood ? ` حي ${neighborhood}` : ""}
        {area ? `، منطقة ${area}` : ""}
      </span>
    </div>
  );
};
export default LocationDisplay;
