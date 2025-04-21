
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Phone, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import LocationPicker from "@/components/ui/LocationPicker";

interface CustomerData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  governorate_id?: string | null;
  city_id?: string | null;
  area_id?: string | null;
  neighborhood_id?: string | null;
}

const EditAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [location, setLocation] = useState<{government?: string; city?: string; area?: string; neighborhood?: string}>({});

  useEffect(() => {
    const loadUserData = async () => {
      const phone = localStorage.getItem('userPhone');
      if (phone) {
        const { data, error } = await supabase
          .from<CustomerData>('customers')
          .select('*')
          .eq('phone', phone)
          .single();

        if (data) {
          setName(data.name || '');
          setPhone(data.phone || '');
          setEmail(data.email || '');
          setAddress(data.address || '');
          setCustomerId(data.id);

          setLocation({
            government: data.governorate_id || '',
            city: data.city_id || '',
            area: data.area_id || '',
            neighborhood: data.neighborhood_id || '',
          });
        }
        if (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        navigate('/account/register');
      }
    };

    loadUserData();
  }, [navigate]);

  const handleBack = () => {
    navigate('/account');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!customerId) throw new Error('No customer ID found');

      const { error } = await supabase
        .from('customers')
        .update({
          name,
          phone,
          email: email || null,
          address,
          governorate_id: location.government || null,
          city_id: location.city || null,
          area_id: location.area || null,
          neighborhood_id: location.neighborhood || null,
        })
        .eq('id', customerId);

      if (error) throw error;

      localStorage.setItem('userName', name);
      localStorage.setItem('userPhone', phone);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userAddress', address);

      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بياناتك بنجاح",
      });

      navigate('/account');
    } catch (error) {
      console.error('Error updating user data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث البيانات",
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
          <button onClick={handleBack} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تعديل البيانات</h1>
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
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل اسمك"
              />
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
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل رقم هاتفك"
              />
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
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل بريدك الإلكتروني"
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label className="font-medium">العنوان</label>
              </div>
              <LocationPicker value={location} onChange={setLocation} />
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
                placeholder="أدخل تفاصيل عنوانك"
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
              'حفظ التعديلات'
            )}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default EditAccount;

