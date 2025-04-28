import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, User, Phone, MapPin, Mail, KeyRound, Map } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LocationPicker, { LocationValue } from "@/components/ui/LocationPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CountryCodeSelector, { Country } from "@/components/ui/CountryCodeSelector";

const Register = () => {
  const navigate = useNavigate();
  const locationRouter = useLocation();
  const { toast } = useToast();
  
  const queryParams = new URLSearchParams(locationRouter.search);
  const phoneFromQuery = queryParams.get('phone') || '';
  const countryCodeFromQuery = queryParams.get('countryCode') || 'EG';
  
  const [phone, setPhone] = useState(phoneFromQuery);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [countryCode, setCountryCode] = useState<Country>(() => {
    const countries = [
      { name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
      { name: 'السعودية', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
      { name: 'الإمارات', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
      { name: 'الكويت', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
      { name: 'البحرين', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
      { name: 'عمان', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
      { name: 'قطر', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
      { name: 'الأردن', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
      { name: 'لبنان', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
      { name: 'فلسطين', code: 'PS', dialCode: '+970', flag: '🇵🇸' },
      { name: 'سوريا', code: 'SY', dialCode: '+963', flag: '🇸🇾' },
      { name: 'العراق', code: 'IQ', dialCode: '+964', flag: '🇮🇶' },
      { name: 'اليمن', code: 'YE', dialCode: '+967', flag: '🇾🇪' },
      { name: 'السودان', code: 'SD', dialCode: '+249', flag: '🇸🇩' },
      { name: 'ليبيا', code: 'LY', dialCode: '+218', flag: '🇱🇾' },
      { name: 'تونس', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
      { name: 'الجزائر', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
      { name: 'المغرب', code: 'MA', dialCode: '+212', flag: '🇲🇦' }
    ];
    return countries.find(c => c.code === countryCodeFromQuery) || 
      { name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' };
  });
  const [locationValue, setLocationValue] = useState<LocationValue>({
    governorate: "",
    city: "",
    area: "",
    neighborhood: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    phone: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    location: "",
    server: ""
  });

  const formatPhoneNumber = (phoneNumber: string, country: Country) => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (country.code === 'EG' && digits.length > 0) {
      return digits.startsWith('0') ? digits.substring(1) : digits;
    }
    return digits;
  };

  const formatInternationalPhone = (phoneNumber: string, country: Country) => {
    const formattedNumber = formatPhoneNumber(phoneNumber, country);
    const dialCode = country.dialCode.replace('+', '');
    return `${dialCode}${formattedNumber}`;
  };

  const validateEgyptianPhone = (phone: string) => {
    return phone.startsWith('1') && phone.length === 10;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors(prev => ({
      ...prev,
      server: ""
    }));
    
    try {
      const cleanPhone = formatPhoneNumber(phone, countryCode);
      
      if (!cleanPhone.trim()) {
        setErrors(prev => ({
          ...prev,
          phone: "رقم الهاتف مطلوب"
        }));
        setIsSubmitting(false);
        return;
      }
      
      if (countryCode.code === 'EG' && !validateEgyptianPhone(cleanPhone)) {
        setErrors(prev => ({
          ...prev,
          phone: "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام بدون 0)"
        }));
        setIsSubmitting(false);
        return;
      }
      
      const fullPhone = formatInternationalPhone(phone, countryCode);
      
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        phone: fullPhone,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: fullPhone,
            countryCode: countryCode.code,
            name: `${firstName} ${lastName}`.trim(),
            address,
            location: locationValue
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "تم التسجيل بنجاح",
        description: "مرحباً بك! تم تسجيل حسابك بنجاح."
      });
      
      navigate("/account");
    } catch (err: any) {
      setErrors(prev => ({
        ...prev,
        server: err?.message || "حدث خطأ أثناء التسجيل"
      }));
      toast({
        title: "خطأ في التسجيل",
        description: err?.message || "حدث خطأ أثناء التسجيل",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      phone: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      location: "",
      server: ""
    };
    
    if (!phone.trim()) {
      newErrors.phone = "رقم الهاتف مطلوب";
      valid = false;
    } else if (countryCode.code === 'EG' && !validateEgyptianPhone(formatPhoneNumber(phone, countryCode))) {
      newErrors.phone = "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام)";
      valid = false;
    }
    
    if (!firstName.trim()) {
      newErrors.firstName = "الاسم الأول مطلوب";
      valid = false;
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = "اسم العائلة مطلوب";
      valid = false;
    }
    
    if (!email.trim() || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email.trim())) {
      newErrors.email = "يرجى إدخال بريد إلكتروني صحيح";
      valid = false;
    }
    
    if (!password || password.length < 6) {
      newErrors.password = "كلمة المرور يجب أن تكون 6 أحرف أو أكثر";
      valid = false;
    }
    
    if (!locationValue.governorate || !locationValue.city || !locationValue.area) {
      newErrors.location = "يرجى اختيار المحافظة والمدينة والمنطقة";
      valid = false;
    }
    
    setErrors(newErrors);
    return valid;
  };

  return (
    <MainLayout>
      <div className="py-4 px-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تسجيل مستخدم جديد</h1>
          <div className="w-10" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="firstName" className="font-medium">الاسم الأول</label>
              </div>
              <Input 
                id="firstName" 
                type="text" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                className="text-right" 
                placeholder="أدخل الاسم الأول" 
              />
              {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="lastName" className="font-medium">اسم العائلة</label>
              </div>
              <Input 
                id="lastName" 
                type="text" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                className="text-right" 
                placeholder="أدخل اسم العائلة" 
              />
              {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Phone size={18} className="ml-2 text-gray-500" />
                <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
              </div>
              <div className="flex gap-2 items-center">
                <CountryCodeSelector 
                  value={countryCode}
                  onChange={setCountryCode}
                  className="min-w-[80px]"
                />
                <Input 
                  id="phone" 
                  type="tel" 
                  value={phone} 
                  onChange={e => {
                    setPhone(e.target.value);
                    setErrors(prev => ({
                      ...prev,
                      phone: ""
                    }));
                  }} 
                  className="text-right ltr flex-1" 
                  placeholder={countryCode.code === 'EG' ? "1xxxxxxxxx" : "xxx-xxxx-xxx"} 
                  dir="ltr"
                />
              </div>
              
              <p className="text-xs text-gray-500 mt-1 text-right">
                {countryCode.code === 'EG' 
                  ? 'أدخل رقم الهاتف المصري الذي يبدأ بـ 1 (مثال: 1xxxxxxxxx)' 
                  : 'أدخل رقم الهاتف بدون رمز الدولة'}
              </p>
              
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Mail size={18} className="ml-2 text-gray-500" />
                <label htmlFor="email" className="font-medium">البريد الإلكتروني</label>
              </div>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="text-right ltr" 
                placeholder="you@example.com" 
                dir="ltr" 
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Map size={18} className="ml-2 text-gray-500" />
                <label className="font-medium">الموقع</label>
              </div>
              <LocationPicker value={locationValue} onChange={setLocationValue} />
              {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="address" className="font-medium">تفاصيل العنوان</label>
              </div>
              <Textarea 
                id="address" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                className="w-full p-3 border border-gray-300 rounded-lg text-right resize-none" 
                placeholder="اكتب تفاصيل عنوانك هنا" 
                rows={3} 
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <KeyRound size={18} className="ml-2 text-gray-500" />
                <label htmlFor="password" className="font-medium">كلمة المرور</label>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="text-right" 
                placeholder="******" 
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
            
            {errors.server && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{errors.server}</p>
              </div>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white py-3">
            {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : "تسجيل"}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
};

export default Register;
