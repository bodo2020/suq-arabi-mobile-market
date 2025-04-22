
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

interface LocationDisplayProps {
  area?: string | null;
  neighborhood?: string | null;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({ area, neighborhood }) => {
  if (!area && !neighborhood) return null;
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 mb-4 flex justify-between items-center">
      <Link to="/account/addresses" className="text-primary text-sm">
        تغيير
      </Link>
      <div className="flex items-center">
        <div className="flex flex-col items-end mr-2">
          <span className="text-sm text-gray-500">التوصيل إلى</span>
          <span className="text-sm font-semibold">
            {neighborhood ? `حي ${neighborhood}` : ""}
            {area && neighborhood ? "، " : ""}
            {area ? `منطقة ${area}` : ""}
          </span>
        </div>
        <MapPin size={18} className="text-primary" />
      </div>
    </div>
  );
};

export default LocationDisplay;
