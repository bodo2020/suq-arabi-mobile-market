
import React, { useState, useEffect } from 'react';
import { MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

interface DeliveryZone {
  id: string;
  name: string;
  governorate: string;
  city?: string;
  area?: string;
  is_active: boolean;
  delivery_fee: number;
  min_order_amount: number;
}

interface DeliveryZoneCheckerProps {
  userLocation?: {
    governorate?: string;
    city?: string;
    area?: string;
    neighborhood?: string;
  };
  onZoneChange?: (zone: DeliveryZone | null) => void;
  className?: string;
}

const DeliveryZoneChecker: React.FC<DeliveryZoneCheckerProps> = ({
  userLocation,
  onZoneChange,
  className = ""
}) => {
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkDeliveryZone = async () => {
      if (!userLocation?.governorate) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query delivery zones based on user location
        let query = supabase
          .from('delivery_zones')
          .select('*')
          .eq('is_active', true)
          .eq('governorate', userLocation.governorate);

        // Add city filter if available
        if (userLocation.city) {
          query = query.or(`city.is.null,city.eq.${userLocation.city}`);
        }

        // Add area filter if available
        if (userLocation.area) {
          query = query.or(`area.is.null,area.eq.${userLocation.area}`);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          throw queryError;
        }

        // Find the most specific matching zone
        let matchingZone: DeliveryZone | null = null;
        
        if (data && data.length > 0) {
          // Priority: area > city > governorate
          matchingZone = data.find(zone => 
            zone.area === userLocation.area
          ) || data.find(zone => 
            zone.city === userLocation.city && !zone.area
          ) || data.find(zone => 
            zone.governorate === userLocation.governorate && !zone.city && !zone.area
          ) || data[0];
        }

        setDeliveryZone(matchingZone);
        onZoneChange?.(matchingZone);
        
      } catch (err) {
        console.error('Error checking delivery zone:', err);
        setError('خطأ في التحقق من منطقة التوصيل');
      } finally {
        setLoading(false);
      }
    };

    checkDeliveryZone();
  }, [userLocation, onZoneChange]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm text-gray-600">جاري التحقق من التوصيل...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!deliveryZone) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <div>
            <p className="font-medium">التوصيل غير متاح</p>
            <p className="text-sm">عذراً، لا نوصل إلى منطقتك حالياً</p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={`border-green-200 bg-green-50 ${className}`}>
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <div>
            <p className="font-medium">التوصيل متاح</p>
            <p className="text-sm">
              {deliveryZone.name} - رسوم التوصيل: {deliveryZone.delivery_fee} جنيه
            </p>
            {deliveryZone.min_order_amount > 0 && (
              <p className="text-xs">
                الحد الأدنى للطلب: {deliveryZone.min_order_amount} جنيه
              </p>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default DeliveryZoneChecker;
