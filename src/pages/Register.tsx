
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Phone, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  id: string;
  name: string;
}

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Location states
  const [governorates, setGovernorates] = useState<LocationData[]>([]);
  const [cities, setCities] = useState<LocationData[]>([]);
  const [areas, setAreas] = useState<LocationData[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationData[]>([]);
  
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchGovernorates();
  }, []);

  useEffect(() => {
    if (selectedGovernorate) {
      fetchCities(selectedGovernorate);
    }
  }, [selectedGovernorate]);

  useEffect(() => {
    if (selectedCity) {
      fetchAreas(selectedCity);
    }
  }, [selectedCity]);

  useEffect(() => {
    if (selectedArea) {
      fetchNeighborhoods(selectedArea);
    }
  }, [selectedArea]);

  const fetchGovernorates = async () => {
    const { data, error } = await supabase
      .from('governorates')
      .select('*')
      .eq('active', true);
    
    if (error) {
      console.error('Error fetching governorates:', error);
      return;
    }
    
    setGovernorates(data);
  };

  const fetchCities = async (governorateId: string) => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('governorate_id', governorateId)
      .eq('active', true);
    
    if (error) {
      console.error('Error fetching cities:', error);
      return;
    }
    
    setCities(data);
  };

  const fetchAreas = async (cityId: string) => {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('city_id', cityId)
      .eq('active', true);
    
    if (error) {
      console.error('Error fetching areas:', error);
      return;
    }
    
    setAreas(data);
  };

  const fetchNeighborhoods = async (areaId: string) => {
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('area_id', areaId)
      .eq('active', true);
    
    if (error) {
      console.error('Error fetching neighborhoods:', error);
      return;
    }
    
    setNeighborhoods(data);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const validate = () => {
    const newErrors = {
      name: '',
      phone: '',
      email: '',
    };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'الاسم مطلوب';
      isValid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
      isValid = false;
    } else if (!/^\d{10,11}$/.test(phone.trim())) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
      isValid = false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to customers table
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([
          {
            name,
            phone,
            email: email || null,
            address,
          }
        ])
        .select()
        .single();

      if (customerError) throw customerError;

      // Save to localStorage for app usage
      localStorage.setItem('userName', name);
      localStorage.setItem('userPhone', phone);
      localStorage.setItem('userEmail', email);
      if (address) {
        localStorage.setItem('userAddress', address);
      }

      toast({
        title: "تم التسجيل بنجاح",
        description: "تم حفظ بياناتك بنجاح",
      });

      setTimeout(() => {
        navigate('/account');
      }, 1000);
    } catch (error) {
      console.error('Error saving user data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ البيانات",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="py-4">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تسجيل البيانات</h1>
          <div className="w-10"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="name" className="font-medium">الاسم</label>
              </div>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل اسمك"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Phone size={18} className="ml-2 text-gray-500" />
                <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
              </div>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل رقم هاتفك"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="email" className="font-medium">البريد الإلكتروني (اختياري)</label>
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل بريدك الإلكتروني"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">المحافظة</label>
                <Select value={selectedGovernorate} onValueChange={setSelectedGovernorate}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر المحافظة" />
                  </SelectTrigger>
                  <SelectContent>
                    {governorates.map((gov) => (
                      <SelectItem key={gov.id} value={gov.id}>
                        {gov.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGovernorate && (
                <div>
                  <label className="block text-sm font-medium mb-2">المدينة</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر المدينة" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedCity && (
                <div>
                  <label className="block text-sm font-medium mb-2">المنطقة</label>
                  <Select value={selectedArea} onValueChange={setSelectedArea}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر المنطقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedArea && (
                <div>
                  <label className="block text-sm font-medium mb-2">الحي</label>
                  <Select value={selectedNeighborhood} onValueChange={setSelectedNeighborhood}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر الحي" />
                    </SelectTrigger>
                    <SelectContent>
                      {neighborhoods.map((neighborhood) => (
                        <SelectItem key={neighborhood.id} value={neighborhood.id}>
                          {neighborhood.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="address" className="font-medium">تفاصيل العنوان</label>
              </div>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل تفاصيل عنوانك للتوصيل"
                rows={3}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'حفظ البيانات'
            )}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default Register;
