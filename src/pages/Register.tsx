
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Phone, MapPin, LogIn, UserPlus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [governorates, setGovernorates] = useState<{ id: string; name: string }[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState<{ id: string; name: string; governorate_id: string }[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [areas, setAreas] = useState<{ id: string; name: string; city_id: string }[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string; area_id: string }[]>([]);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    otp: '',
  });

  useEffect(() => {
    const fetchGovernorates = async () => {
      const { data, error } = await supabase
        .from('governorates')
        .select('id, name');
      if (!error && data) {
        setGovernorates(data);
      }
    };
    fetchGovernorates();
  }, []);

  useEffect(() => {
    if (!selectedGovernorate) {
      setCities([]);
      setSelectedCity('');
      setAreas([]);
      setSelectedArea('');
      return;
    }
    const fetchCities = async () => {
      const govObj = governorates.find(gov => gov.name === selectedGovernorate);
      if (!govObj) {
        setCities([]);
        setSelectedCity('');
        setAreas([]);
        setSelectedArea('');
        return;
      }
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, governorate_id')
        .eq('governorate_id', govObj.id);
      if (!error && data) {
        setCities(data);
      }
    };
    fetchCities();
    setSelectedCity('');
    setAreas([]);
    setSelectedArea('');
  }, [selectedGovernorate, governorates]);

  useEffect(() => {
    if (!selectedCity) {
      setAreas([]);
      setSelectedArea('');
      return;
    }
    const fetchAreas = async () => {
      const cityObj = cities.find(city => city.name === selectedCity);
      if (!cityObj) {
        setAreas([]);
        setSelectedArea('');
        return;
      }
      const { data, error } = await supabase
        .from('areas')
        .select('id, name, city_id')
        .eq('city_id', cityObj.id);
      if (!error && data) {
        setAreas(data);
      }
    };
    fetchAreas();
    setSelectedArea('');
  }, [selectedCity, cities]);

  useEffect(() => {
    if (!selectedArea) {
      setNeighborhoods([]);
      setSelectedNeighborhood('');
      return;
    }
    const fetchNeighborhoods = async () => {
      const areaObj = areas.find(area => area.name === selectedArea);
      if (!areaObj) {
        setNeighborhoods([]);
        setSelectedNeighborhood('');
        return;
      }
      const { data, error } = await supabase
        .from('neighborhoods')
        .select('id, name, area_id')
        .eq('area_id', areaObj.id);
      if (!error && data) {
        setNeighborhoods(data);
      }
    };
    fetchNeighborhoods();
    setSelectedNeighborhood('');
  }, [selectedArea, areas]);

  // Convert 010... Egyptian numbers to E.164 +20...
  const normalizePhone = (input: string) => {
    const trimmed = input.trim();
    if (/^01\d{9}$/.test(trimmed)) {
      return '+2' + trimmed;
    }
    if (/^\+?\d{11,13}$/.test(trimmed)) {
      return trimmed.startsWith('+') ? trimmed : '+' + trimmed;
    }
    return '';
  };

  const validateRegister = () => {
    let valid = true;
    const newErrors = {
      firstName: '',
      lastName: '',
      phone: '',
      otp: '',
    };

    if (!firstName.trim()) {
      newErrors.firstName = 'الاسم الأول مطلوب';
      valid = false;
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'اسم العائلة مطلوب';
      valid = false;
    }
    const normalized = normalizePhone(phone);
    if (!normalized) {
      newErrors.phone = 'رقم الهاتف غير صحيح (يجب أن يكون مصريا من 11 رقم)';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const validateLogin = () => {
    let valid = true;
    const newErrors = {
      phone: '',
      otp: '',
      firstName: '',
      lastName: '',
    };
    const normalized = normalizePhone(phone);
    if (!normalized) {
      newErrors.phone = 'رقم الهاتف غير صحيح (يجب أن يكون مصريا من 11 رقم)';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register' && !validateRegister()) return;
    if (mode === 'login' && !validateLogin()) return;
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, otp: '' }));

    const normalized = normalizePhone(phone);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: {
          ...(mode === 'register'
            ? {
                data: {
                  first_name: firstName,
                  last_name: lastName,
                  address,
                  governorate: selectedGovernorate,
                  city: selectedCity,
                  area: selectedArea,
                  neighborhood: selectedNeighborhood,
                  name: `${firstName} ${lastName}`.trim(),
                },
              }
            : undefined),
        },
      });
      if (error) throw error;
      setOtpSent(true);
      toast({
        title: 'تم إرسال كود التحقق',
        description: `تم إرسال كود التحقق إلى رقمك الهاتفي.`,
      });
    } catch (err: any) {
      toast({
        title: 'حدث خطأ',
        description: err.message || 'فشل إرسال الكود، تحقق من صحة الرقم أو حاول لاحقاً',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, otp: '' }));
    const normalized = normalizePhone(phone);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;

      toast({
        title: mode === 'register' ? 'تم التسجيل بنجاح' : 'تم تسجيل الدخول بنجاح',
        description: mode === 'register'
          ? 'تم تسجيل الحساب والدخول تلقائيا'
          : 'تم تسجيل الدخول بنجاح',
      });

      // On first registration, auto push customer record if not existing
      // Note: The server should trigger handle_new_user, but here is a fallback
      if (mode === 'register' && data?.user?.id) {
        // Fill customer table, if needed.
        await supabase.from('customers').upsert({
          user_id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          phone: normalized,
          name: `${firstName} ${lastName}`.trim(),
          address,
        }, { onConflict: 'user_id' });
      }

      navigate('/account');
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, otp: 'كود غير صحيح أو منتهي الصلاحية' }));
      toast({
        title: 'خطأ في التحقق',
        description: err.message || 'فشل تحقق الكود',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (otpSent) {
      setOtpSent(false);
      setOtp('');
      setIsSubmitting(false);
      return;
    }
    navigate(-1);
  };

  const switchMode = () => {
    setMode(mode === 'register' ? 'login' : 'register');
    setErrors({
      firstName: '',
      lastName: '',
      phone: '',
      otp: '',
    });
    setFirstName('');
    setLastName('');
    setPhone('');
    setAddress('');
    setOtp('');
    setOtpSent(false);
  };

  return (
    <MainLayout>
      <div className="py-4 px-0 max-w-md mx-auto hide-scrollbar">
        <div className="flex justify-center mb-8">
          <button
            className={`flex-1 py-2 border-b-2 transition-all flex items-center justify-center gap-2 text-base font-bold 
              ${mode === 'login' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
            onClick={() => switchMode()}
            type="button"
          >
            <LogIn /> تسجيل الدخول
          </button>
          <button
            className={`flex-1 py-2 border-b-2 transition-all flex items-center justify-center gap-2 text-base font-bold 
              ${mode === 'register' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
            onClick={() => switchMode()}
            type="button"
          >
            <UserPlus /> إنشاء حساب
          </button>
        </div>

        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">
            {mode === 'register'
              ? otpSent ? 'تأكيد الكود' : 'تسجيل مستخدم جديد'
              : otpSent ? 'أدخل كود الدخول' : 'تسجيل الدخول'}
          </h1>
          <div className="w-10" />
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              {mode === 'register' && (
                <>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <User size={18} className="ml-2 text-gray-500" />
                      <label htmlFor="firstName" className="font-medium">الاسم الأول</label>
                    </div>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={`w-full p-3 border rounded-lg text-right ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="أدخل الاسم الأول"
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <User size={18} className="ml-2 text-gray-500" />
                      <label htmlFor="lastName" className="font-medium">اسم العائلة</label>
                    </div>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={`w-full p-3 border rounded-lg text-right ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="أدخل اسم العائلة"
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <label htmlFor="governorate" className="font-medium">المحافظة</label>
                    </div>
                    <select
                      id="governorate"
                      value={selectedGovernorate}
                      onChange={e => setSelectedGovernorate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-right"
                      required
                    >
                      <option value="">اختر المحافظة</option>
                      {governorates.map(gov => (
                        <option key={gov.id} value={gov.name}>{gov.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <label htmlFor="city" className="font-medium">المدينة</label>
                    </div>
                    <select
                      id="city"
                      value={selectedCity}
                      onChange={e => setSelectedCity(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-right"
                      disabled={!selectedGovernorate || cities.length === 0}
                      required
                    >
                      <option value="">اختر المدينة</option>
                      {cities.map(city => (
                        <option key={city.id} value={city.name}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <label htmlFor="area" className="font-medium">المنطقة</label>
                    </div>
                    <select
                      id="area"
                      value={selectedArea}
                      onChange={e => setSelectedArea(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-right"
                      disabled={!selectedCity || areas.length === 0}
                      required
                    >
                      <option value="">اختر المنطقة</option>
                      {areas.map(area => (
                        <option key={area.id} value={area.name}>{area.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <label htmlFor="neighborhood" className="font-medium">الحي</label>
                    </div>
                    <select
                      id="neighborhood"
                      value={selectedNeighborhood}
                      onChange={e => setSelectedNeighborhood(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-right"
                      disabled={!selectedArea || neighborhoods.length === 0}
                      required
                    >
                      <option value="">اختر الحي</option>
                      {neighborhoods.map(neigh => (
                        <option key={neigh.id} value={neigh.name}>{neigh.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <MapPin size={18} className="ml-2 text-gray-500" />
                      <label htmlFor="address" className="font-medium">العنوان</label>
                    </div>
                    <textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-right"
                      placeholder="أدخل عنوانك"
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <Phone size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full p-3 border rounded-lg text-right ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="01xxxxxxxxx"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                mode === 'register' ? 'إرسال كود التسجيل' : <>
                  <LogIn className="ml-2" size={20} />إرسال كود الدخول
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <label htmlFor="otp" className="font-medium">أدخل كود التحقق</label>
                </div>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={`w-full p-3 border rounded-lg text-right ${errors.otp ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="ادخل الكود المرسل"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                />
                {errors.otp && <p className="text-red-500 text-sm mt-1">{errors.otp}</p>}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                mode === 'register' ? 'تأكيد التسجيل' : 'تأكيد الدخول'
              )}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleBack}
              className="mt-3 w-full text-primary underline"
            >
              تغيير رقم الهاتف
            </button>
          </form>
        )}

        <div className="my-4 text-center">
          <button
            onClick={switchMode}
            className="text-sm text-primary underline mt-1"
          >
            {mode === 'register'
              ? 'لديك حساب بالفعل؟ تسجيل الدخول'
              : 'ليس لديك حساب؟ إنشاء حساب جديد'
            }
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Register;
