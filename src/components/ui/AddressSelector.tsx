import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import LocationPicker from '@/components/ui/LocationPicker';
import { MapPin, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LocationValue {
  governorate?: string;
  city?: string;
  area?: string;
  neighborhood?: string;
}

interface AddressSelectorProps {
  onAddressSelect: (addressData: any) => void;
  children?: React.ReactNode;
  defaultValue?: LocationValue;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({
  onAddressSelect,
  children,
  defaultValue
}) => {
  const [open, setOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationValue>(defaultValue || {});
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedLocation.neighborhood) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار العنوان كاملاً",
        variant: "destructive"
      });
      return;
    }

    if (!addressText.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال تفاصيل العنوان",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // جلب بيانات الحي لحساب سعر التوصيل
      const { data: neighborhoodData, error } = await supabase
        .from('neighborhoods')
        .select('*, areas(name, cities(name, governorates(name)))')
        .eq('id', selectedLocation.neighborhood)
        .single();

      if (error) throw error;

      const addressData = {
        governorate_id: selectedLocation.governorate,
        city_id: selectedLocation.city,
        area_id: selectedLocation.area,
        neighborhood_id: selectedLocation.neighborhood,
        address: addressText,
        delivery_price: neighborhoodData?.price || 0,
        estimated_time: neighborhoodData?.estimated_time || 'غير محدد',
        full_address: `${neighborhoodData.areas.cities.governorates.name}, ${neighborhoodData.areas.cities.name}, ${neighborhoodData.areas.name}, ${neighborhoodData.name} - ${addressText}`,
        neighborhood_name: neighborhoodData.name,
        area_name: neighborhoodData.areas.name,
        city_name: neighborhoodData.areas.cities.name,
        governorate_name: neighborhoodData.areas.cities.governorates.name
      };

      // حفظ في localStorage للمستخدمين غير المسجلين
      localStorage.setItem('selectedAddress', JSON.stringify(addressData));

      onAddressSelect(addressData);
      setOpen(false);
      
      toast({
        title: "تم الحفظ",
        description: "تم حفظ العنوان بنجاح"
      });

    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ العنوان",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // تحميل العنوان المحفوظ من localStorage
    const savedAddress = localStorage.getItem('selectedAddress');
    if (savedAddress) {
      try {
        const parsedAddress = JSON.parse(savedAddress);
        setSelectedLocation({
          governorate: parsedAddress.governorate_id,
          city: parsedAddress.city_id,
          area: parsedAddress.area_id,
          neighborhood: parsedAddress.neighborhood_id
        });
        setAddressText(parsedAddress.address || '');
      } catch (error) {
        console.error('Error parsing saved address:', error);
      }
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full justify-start">
            <MapPin className="w-4 h-4 ml-2" />
            اختر العنوان
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">اختر عنوان التوصيل</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <LocationPicker
            value={selectedLocation}
            onChange={setSelectedLocation}
          />
          
          <div>
            <label className="block text-sm font-medium mb-2">
              تفاصيل العنوان
            </label>
            <textarea
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="أدخل تفاصيل العنوان (رقم المبنى، الشارع، معالم مميزة...)"
              className="w-full p-3 border rounded-lg resize-none h-20"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ العنوان'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressSelector;