
import React, { useState, useEffect } from 'react';
import { MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';

interface Location {
  id: string;
  name: string;
  governorate?: string;
  city?: string;
  area?: string;
  neighborhood?: string;
}

interface LocationSelectorProps {
  onLocationSelected: (location: Location) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationSelected }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAvailableLocations();
  }, []);

  const fetchAvailableLocations = async () => {
    try {
      setLoading(true);
      
      // Fetch all areas with their related governorates, cities, and neighborhoods
      const { data: areas, error } = await supabase
        .from('areas')
        .select(`
          id,
          name,
          cities (
            name,
            governorates (
              name
            )
          ),
          neighborhoods (
            id,
            name
          )
        `)
        .eq('active', true);

      if (error) throw error;

      // Transform the data into a flat structure for easier display
      const locationOptions: Location[] = [];
      
      areas?.forEach(area => {
        // Add the area itself
        locationOptions.push({
          id: area.id,
          name: area.name,
          governorate: area.cities?.governorates?.name,
          city: area.cities?.name,
          area: area.name
        });

        // Add neighborhoods if they exist
        area.neighborhoods?.forEach(neighborhood => {
          locationOptions.push({
            id: neighborhood.id,
            name: `${area.name} - ${neighborhood.name}`,
            governorate: area.cities?.governorates?.name,
            city: area.cities?.name,
            area: area.name,
            neighborhood: neighborhood.name
          });
        });
      });

      setLocations(locationOptions);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل المواقع المتاحة"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  const handleConfirm = async () => {
    if (!selectedLocation) {
      toast({
        variant: "destructive",
        title: "تنبيه",
        description: "يرجى اختيار موقع أولاً"
      });
      return;
    }

    try {
      // Save the selected location to localStorage
      localStorage.setItem('userArea', selectedLocation.area || '');
      localStorage.setItem('userNeighborhood', selectedLocation.neighborhood || '');
      localStorage.setItem('locationSelected', 'true');

      // If user is logged in, save to their profile
      if (user) {
        // Find area and neighborhood IDs for database storage
        const { data: areaData } = await supabase
          .from('areas')
          .select('id, city_id, cities(governorate_id)')
          .eq('name', selectedLocation.area)
          .single();

        let neighborhoodId = null;
        if (selectedLocation.neighborhood) {
          const { data: neighborhoodData } = await supabase
            .from('neighborhoods')
            .select('id')
            .eq('name', selectedLocation.neighborhood)
            .eq('area_id', areaData?.id)
            .single();
          neighborhoodId = neighborhoodData?.id;
        }

        // Update customer profile
        await supabase
          .from('customers')
          .update({
            governorate_id: areaData?.cities?.governorate_id,
            city_id: areaData?.city_id,
            area_id: areaData?.id,
            neighborhood_id: neighborhoodId
          })
          .eq('user_id', user.id);
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ موقعك بنجاح"
      });

      onLocationSelected(selectedLocation);
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الموقع"
      });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6">
            <div className="flex justify-center items-center h-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <MapPin size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">اختر موقعك</h2>
            <p className="text-gray-600 text-sm">
              يرجى اختيار المنطقة التي تريد التوصيل إليها
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto mb-6">
            <div className="space-y-2">
              {locations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => handleLocationSelect(location)}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedLocation?.id === location.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{location.name}</div>
                      <div className="text-sm text-gray-500">
                        {location.governorate} - {location.city}
                      </div>
                    </div>
                    {selectedLocation?.id === location.id && (
                      <Check size={20} className="text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/add-address')}
              variant="outline"
              className="flex-1"
            >
              إضافة عنوان جديد
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="flex-1"
            >
              تأكيد
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationSelector;
