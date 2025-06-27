import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, X, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import MapLocationPicker from '@/components/ui/MapLocationPicker';
import { useLocation } from '@/hooks/useLocation';

interface Governorate {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  governorate_id: string;
}

interface Area {
  id: string;
  name: string;
  city_id: string;
}

interface Neighborhood {
  id: string;
  name: string;
  area_id: string;
}

interface ModernLocationSelectorProps {
  onLocationSelected: (location: any) => void;
}

const ModernLocationSelector: React.FC<ModernLocationSelectorProps> = ({ onLocationSelected }) => {
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user has granted location permission
    if (location.latitude && location.longitude && !location.error) {
      setShowMapPicker(true);
    } else if (location.error) {
      // If location access denied, show manual entry
      setShowManualEntry(true);
      fetchGovernorates();
    }
    setLoading(false);
  }, [location]);

  const fetchGovernorates = async () => {
    try {
      const { data, error } = await supabase
        .from('governorates')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      setGovernorates(data || []);
    } catch (error) {
      console.error('Error fetching governorates:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل المحافظات"
      });
    }
  };

  const fetchCities = async (governorateId: string) => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, governorate_id')
        .eq('governorate_id', governorateId)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchAreas = async (cityId: string) => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('id, name, city_id')
        .eq('city_id', cityId)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const fetchNeighborhoods = async (areaId: string) => {
    try {
      const { data, error } = await supabase
        .from('neighborhoods')
        .select('id, name, area_id')
        .eq('area_id', areaId)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      setNeighborhoods(data || []);
    } catch (error) {
      console.error('Error fetching neighborhoods:', error);
    }
  };

  const handleGovernorateChange = (governorateId: string) => {
    setSelectedGovernorate(governorateId);
    setSelectedCity('');
    setSelectedArea('');
    setSelectedNeighborhood('');
    setCities([]);
    setAreas([]);
    setNeighborhoods([]);
    
    if (governorateId) {
      fetchCities(governorateId);
    }
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCity(cityId);
    setSelectedArea('');
    setSelectedNeighborhood('');
    setAreas([]);
    setNeighborhoods([]);
    
    if (cityId) {
      fetchAreas(cityId);
    }
  };

  const handleAreaChange = (areaId: string) => {
    setSelectedArea(areaId);
    setSelectedNeighborhood('');
    setNeighborhoods([]);
    
    if (areaId) {
      fetchNeighborhoods(areaId);
    }
  };

  const handleConfirm = async () => {
    if (!selectedArea) {
      toast({
        variant: "destructive",
        title: "تنبيه",
        description: "يرجى اختيار المنطقة على الأقل"
      });
      return;
    }

    try {
      const selectedGovernorateData = governorates.find(g => g.id === selectedGovernorate);
      const selectedCityData = cities.find(c => c.id === selectedCity);
      const selectedAreaData = areas.find(a => a.id === selectedArea);
      const selectedNeighborhoodData = neighborhoods.find(n => n.id === selectedNeighborhood);

      // Save to localStorage
      localStorage.setItem('userGovernorate', selectedGovernorateData?.name || '');
      localStorage.setItem('userCity', selectedCityData?.name || '');
      localStorage.setItem('userArea', selectedAreaData?.name || '');
      localStorage.setItem('userNeighborhood', selectedNeighborhoodData?.name || '');
      localStorage.setItem('locationSelected', 'true');

      // If user is logged in, save to their profile
      if (user) {
        await supabase
          .from('customers')
          .update({
            governorate_id: selectedGovernorate,
            city_id: selectedCity,
            area_id: selectedArea,
            neighborhood_id: selectedNeighborhood || null
          })
          .eq('user_id', user.id);
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ موقعك بنجاح"
      });

      onLocationSelected({
        governorate: selectedGovernorateData?.name,
        city: selectedCityData?.name,
        area: selectedAreaData?.name,
        neighborhood: selectedNeighborhoodData?.name
      });
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الموقع"
      });
    }
  };

  const handleMapLocationSelected = (mapLocation: any) => {
    onLocationSelected(mapLocation);
  };

  const handleManualEntryFromMap = () => {
    setShowMapPicker(false);
    setShowManualEntry(true);
    fetchGovernorates();
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

  if (showMapPicker) {
    return (
      <MapLocationPicker 
        onLocationSelected={handleMapLocationSelected}
        onManualEntry={handleManualEntryFromMap}
      />
    );
  }

  if (showManualEntry) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <MapPin size={48} className="mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-bold mb-2">اختر موقعك</h2>
              <p className="text-gray-600 text-sm">
                يرجى اختيار الموقع الذي تريد التوصيل إليه
              </p>
            </div>

            <div className="space-y-4">
              {/* Governorate Selector */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">المحافظة*</label>
                <div className="relative">
                  <select
                    value={selectedGovernorate}
                    onChange={(e) => handleGovernorateChange(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">اختر...</option>
                    {governorates.map((gov) => (
                      <option key={gov.id} value={gov.id}>
                        {gov.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>

              {/* City Selector */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">المدينة*</label>
                <div className="relative">
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    disabled={!selectedGovernorate}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">اختر...</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>

              {/* Area Selector */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">المنطقة*</label>
                <div className="relative">
                  <select
                    value={selectedArea}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    disabled={!selectedCity}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">اختر...</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>

              {/* Neighborhood Selector */}
              {areas.length > 0 && selectedArea && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">الحي</label>
                  <div className="relative">
                    <select
                      value={selectedNeighborhood}
                      onChange={(e) => setSelectedNeighborhood(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">اختر...</option>
                      {neighborhoods.map((neighborhood) => (
                        <option key={neighborhood.id} value={neighborhood.id}>
                          {neighborhood.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3">
              <Button
                onClick={handleConfirm}
                disabled={!selectedArea}
                className="w-full py-3 text-white font-medium"
              >
                تأكيد الموقع
              </Button>
              
              <Button
                onClick={() => setShowMapPicker(true)}
                variant="outline"
                className="w-full py-3 text-primary border-primary hover:bg-primary hover:text-white"
              >
                <Map className="ml-2" size={16} />
                تحديد الموقع على الخريطة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initial choice screen
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <MapPin size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">تحديد الموقع</h2>
            <p className="text-gray-600 text-sm">
              اختر طريقة تحديد موقعك للتوصيل
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setShowMapPicker(true)}
              className="w-full py-4 text-white font-medium flex items-center justify-center gap-2"
            >
              <Map size={20} />
              تحديد الموقع على الخريطة
            </Button>
            
            <Button
              onClick={() => {
                setShowManualEntry(true);
                fetchGovernorates();
              }}
              variant="outline"
              className="w-full py-4 text-primary border-primary hover:bg-primary hover:text-white flex items-center justify-center gap-2"
            >
              <MapPin size={20} />
              إدخال الموقع يدوياً
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModernLocationSelector;
