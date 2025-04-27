
import React from 'react';

interface LocationDisplayProps {
  area?: string | null;
  neighborhood?: string | null;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({ area, neighborhood }) => {
  if (!area && !neighborhood) return null;

  return (
    <div className="flex justify-end items-center mb-4 mt-1">
      <span className="text-sm font-semibold text-gray-700">
        {neighborhood && <span>{neighborhood}</span>}
        {(neighborhood && area) && <span>، </span>}
        {area && <span>{area}</span>}
      </span>
    </div>
  );
};

export default LocationDisplay;
