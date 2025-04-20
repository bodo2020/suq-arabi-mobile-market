
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
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [governorates, setGovernorates] = useState<{ id: string; name: string }[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState<{ id: string; name: string; governorate_id: string }[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [areas, setAreas] = useState<{ id: string; name: string; city_id: string }[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string; area_id: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    passwordConfirm: '',
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

  const validateRegister = () => {
    let valid = true;
    const newErrors = {
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      passwordConfirm: '',
    };

    if (!firstName.trim()) {
      newErrors.firstName = 'الاسم الأول مطلوب';
      valid = false;
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'اسم العائلة مطلوب';
      valid = false;
    }
    if (!phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
      valid = false;
    } else if (!/^\d{10,11}$/.test(phone.trim())) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
      valid = false;
    }
    if (password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      valid = false;
    }
    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'كلمتا المرور غير متطابقتين';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const validateLogin = () => {
    let valid = true;
    const newErrors = {
      phone: '',
      password: '',
      firstName: '',
      lastName: '',
      passwordConfirm: ''
    };
    if (!phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
      valid = false;
    } else if (!/^\d{10,11}$/.test(phone.trim())) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
      valid = false;
    }
    if (!password) {
      newErrors.password = 'كلمة المرور مطلوبة';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      passwordConfirm: '',
    });

    if (mode === 'register') {
      if (!validateRegister()) return;
      setIsSubmitting(true);

      try {
        const randomEmail = `${phone}@example.com`;
        const fullName = `${firstName} ${lastName}`.trim();
        
        // First, create the user in Supabase Auth with proper metadata
        const { data, error } = await supabase.auth.signUp({
          email: randomEmail,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              address: address,
              governorate: selectedGovernorate,
              city: selectedCity,
              area: selectedArea,
              neighborhood: selectedNeighborhood,
              name: fullName, // Make sure name is explicitly set
            },
          },
        });
        
        if (error) throw error;
        
        if (!data.user) {
          throw new Error('User registration failed');
        }

        // Then insert the customer record with the same data
        const customerData = {
          user_id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          email: randomEmail,
          phone: phone,
          address: address,
          name: fullName, // Ensure name is properly set here as well
        };

        const { error: customerError } = await supabase
          .from('customers')
          .insert([customerData]);

        if (customerError) throw customerError;

        // Once everything is successful, sign in the user
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: randomEmail, 
          password 
        });
        
        if (signInError) throw signInError;

        toast({
          title: 'تم التسجيل بنجاح',
          description: 'تم إنشاء الحساب وتسجيل الدخول',
        });

        navigate('/account');
      } catch (error: any) {
        console.error('Registration error:', error);
        toast({
          title: 'خطأ في التسجيل',
          description: error.message || 'حدث خطأ أثناء التسجيل',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    } else if (mode === 'login') {
      if (!validateLogin()) return;
      setIsSubmitting(true);

      try {
        const { data: customerData, error: custErr } = await supabase
          .from('customers')
          .select('email')
          .eq('phone', phone.trim())
          .maybeSingle();
        if (!customerData || !customerData.email) {
          throw new Error('لم يتم العثور على حساب مرتبط بهذا الرقم');
        }
        const userEmail = customerData.email;
        const { error } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password,
        });
        if (!error) {
          toast({
            title: 'تم تسجيل الدخول بنجاح',
          });
          navigate('/account');
          setIsSubmitting(false);
          return;
        }
        throw error;
      } catch (error: any) {
        toast({
          title: 'خطأ في تسجيل الدخول',
          description: error.message || 'حدث خطأ أثناء تسجيل الدخول',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const switchMode = () => {
    setMode(mode === 'register' ? 'login' : 'register');
    setErrors({
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      passwordConfirm: '',
    });
    setFirstName('');
    setLastName('');
    setPhone('');
    setAddress('');
    setPassword('');
    setPasswordConfirm('');
  };

  return (
    <MainLayout>
      <div className="py-4 px-0 max-w-md mx-auto hide-scrollbar">
        <div className="flex justify-center mb-8">
          <button
            className={`flex-1 py-2 border-b-2 transition-all flex items-center justify-center gap-2 text-base font-bold 
              ${mode === 'login' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
            onClick={() => setMode('login')}
            type="button"
          >
            <LogIn /> تسجيل الدخول
          </button>
          <button
            className={`flex-1 py-2 border-b-2 transition-all flex items-center justify-center gap-2 text-base font-bold 
              ${mode === 'register' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
            onClick={() => setMode('register')}
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
            {mode === 'register' ? 'تسجيل مستخدم جديد' : 'تسجيل الدخول'}
          </h1>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="أدخل رقم الهاتف"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="password" className="font-medium">كلمة المرور</label>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل كلمة المرور"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {mode === 'register' && (
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <User size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="passwordConfirm" className="font-medium">تأكيد كلمة المرور</label>
                </div>
                <input
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className={`w-full p-3 border rounded-lg text-right ${errors.passwordConfirm ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="أدخل تأكيد كلمة المرور"
                />
                {errors.passwordConfirm && <p className="text-red-500 text-sm mt-1">{errors.passwordConfirm}</p>}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              mode === 'register' ? 'تسجيل' : <>
                <LogIn className="ml-2" size={20}/>تسجيل الدخول
              </>
            )}
          </button>
        </form>
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
