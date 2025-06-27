
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import GoogleMap from '@/components/ui/GoogleMap';
import { useLocation } from '@/hooks/useLocation';

interface MapLocationPickerProps {
  onLocationSelected: (location: any) => void;
  onManualEntry: () => void;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({ 
  onLocationSelected, 
  onManualEntry 
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Use current location if available
  useEffect(() => {
    if (location.latitude && location.longitude) {
      setSelectedLocation({
        lat: location.latitude,
        lng: location.longitude
      });
    }
  }, [location]);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    // Here you would typically reverse geocode to get the address
    setAddress(`الموقع: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const handleConfirmLocation = async () => {
    if (!selectedLocation) {
      toast({
        variant: "destructive",
        title: "تنبيه",
        description: "يرجى اختيار موقع على الخريطة"
      });
      return;
    }

    setLoading(true);
    try {
      // Save location to localStorage
      localStorage.setItem('userLatitude', selectedLocation.lat.toString());
      localStorage.setItem('userLongitude', selectedLocation.lng.toString());
      localStorage.setItem('userAddress', address);
      localStorage.setItem('locationSelected', 'true');

      // If user is logged in, save to their profile
      if (user) {
        await supabase
          .from('customers')
          .update({
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            address: address
          })
          .eq('user_id', user.id);
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ موقعك بنجاح"
      });

      onLocationSelected({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address
      });
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الموقع"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <MapPin size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">حدد موقعك على الخريطة</h2>
            <p className="text-gray-600 text-sm">
              اضغط على الخريطة لتحديد موقعك الدقيق
            </p>
          </div>

          <div className="mb-6">
            <GoogleMap
              center={selectedLocation || { lat: 24.7136, lng: 46.6753 }}
              zoom={15}
              height="300px"
              className="rounded-lg border"
            />
          </div>

          {selectedLocation && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{address}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleConfirmLocation}
              disabled={!selectedLocation || loading}
              className="w-full py-3 text-white font-medium"
            >
              {loading ? 'جاري الحفظ...' : 'تأكيد الموقع'}
            </Button>
            
            <Button
              onClick={onManualEntry}
              variant="outline"
              className="w-full py-3 text-primary border-primary hover:bg-primary hover:text-white"
            >
              إدخال الموقع يدوياً
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapLocationPicker;
