import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, User, Phone, MapPin, KeyRound, Map, Mail } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import LocationPicker, { LocationValue } from "@/components/ui/LocationPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CountryCodeSelector, { Country } from "@/components/ui/CountryCodeSelector";
import { supabase } from "@/lib/supabase";

const countries: Country[] = [
  { name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'السعودية', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'الإمارات', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'الكويت', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'البحرين', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'قطر', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'عمان', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'الأردن', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'لبنان', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'فلسطين', code: 'PS', dialCode: '+970', flag: '🇵🇸' },
  { name: 'سوريا', code: 'SY', dialCode: '+963', flag: '🇸🇾' },
  { name: 'العراق', code: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { name: 'ليبيا', code: 'LY', dialCode: '+218', flag: '🇱🇾' },
  { name: 'تونس', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'الجزائر', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'المغرب', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'السودان', code: 'SD', dialCode: '+249', flag: '🇸🇩' },
  { name: 'اليمن', code: 'YE', dialCode: '+967', flag: '🇾🇪' },
];

const normalizePhone = (value: string) => `+${value.replace(/\D/g, '')}`;

const Register = () => {
  const navigate = useNavigate();
  const locationRouter = useLocation();
  const { signUp } = useUser();
  const { toast } = useToast();

  const queryParams = new URLSearchParams(locationRouter.search);
  const phoneFromQuery = queryParams.get('phone') || '';
  const countryCodeFromQuery = queryParams.get('countryCode') || 'EG';

  const [phone, setPhone] = useState(phoneFromQuery);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [countryCode, setCountryCode] = useState<Country>(
    countries.find((country) => country.code === countryCodeFromQuery) || countries[0]
  );
  const [locationValue, setLocationValue] = useState<LocationValue>({
    governorate: "",
    city: "",
    area: "",
    neighborhood: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [verifiedAuthPhone, setVerifiedAuthPhone] = useState('');
  const [errors, setErrors] = useState({
    phone: "",
    email: "",
    firstName: "",
    lastName: "",
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
    const dialCode = country.dialCode.replace(/\D/g, '');
    return `+${dialCode}${formattedNumber}`;
  };

  const validateEgyptianPhone = (value: string) => value.startsWith('1') && value.length === 10;
  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  useEffect(() => {
    let mounted = true;

    const verifyRegistrationSession = async () => {
      const { data, error } = await supabase.auth.getUser();
      const authUser = data.user;

      if (!mounted) return;

      if (error || !authUser?.phone) {
        toast({
          title: 'تحقق من رقم الهاتف أولاً',
          description: 'يجب تأكيد رقم الهاتف قبل إنشاء الحساب.',
          variant: 'destructive',
        });
        navigate('/phone-verify', { replace: true });
        return;
      }

      const authPhone = normalizePhone(authUser.phone);
      setVerifiedAuthPhone(authPhone);

      if (!phoneFromQuery) {
        // Preserve the verified phone in the form even if the page was opened
        // without query parameters.
        setPhone(authUser.phone);
      }

      setAuthChecking(false);
    };

    void verifyRegistrationSession();
    return () => { mounted = false; };
  }, [navigate, phoneFromQuery, toast]);

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      phone: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      location: "",
      server: ""
    };

    const cleanPhone = formatPhoneNumber(phone, countryCode);
    const fullPhone = formatInternationalPhone(phone, countryCode);

    if (!cleanPhone.trim()) {
      newErrors.phone = "رقم الهاتف مطلوب";
      valid = false;
    } else if (countryCode.code === 'EG' && !validateEgyptianPhone(cleanPhone)) {
      newErrors.phone = "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام بدون 0)";
      valid = false;
    } else if (!verifiedAuthPhone || normalizePhone(fullPhone) !== verifiedAuthPhone) {
      newErrors.phone = "رقم الهاتف لا يطابق الرقم الذي تم التحقق منه";
      valid = false;
    }

    if (!email.trim()) {
      newErrors.email = "البريد الإلكتروني مطلوب";
      valid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "يرجى إدخال بريد إلكتروني صحيح";
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
    if (!password || password.length < 8) {
      newErrors.password = "كلمة المرور يجب أن تكون 8 أحرف أو أكثر";
      valid = false;
    }
    if (!locationValue.governorate || !locationValue.city || !locationValue.area) {
      newErrors.location = "يرجى اختيار المحافظة والمدينة والمنطقة";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authChecking || isSubmitting || !validateForm()) return;

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, server: "" }));

    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      const { data, error } = await signUp(email, fullPhone, password, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: fullPhone,
        countryCode: countryCode.code,
        name: `${firstName.trim()} ${lastName.trim()}`,
        address,
        location: locationValue
      });
      if (error) throw error;

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.id) {
        throw userError || new Error('تعذر تحديد المستخدم بعد التسجيل');
      }

      const userId = userData.user.id;

      const { error: customerError } = await supabase
        .from('customers')
        .upsert({
          user_id: userId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: fullPhone,
          email: email.trim(),
          address: address || null,
        }, { onConflict: 'user_id' });

      if (customerError) throw customerError;

      if (address) {
        const { count } = await supabase
          .from('customer_addresses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);

        const { error: addressError } = await supabase
          .from('customer_addresses')
          .insert({
            user_id: userId,
            address,
            governorate_id: locationValue.governorate || null,
            city_id: locationValue.city || null,
            area_id: locationValue.area || null,
            neighborhood_id: locationValue.neighborhood || null,
            is_default: count === 0,
          });

        if (addressError) throw addressError;
      }

      if (locationValue.area) {
        const { data: areaData } = await supabase
          .from('areas')
          .select('name')
          .eq('id', locationValue.area)
          .single();
        if (areaData?.name) localStorage.setItem('userArea', areaData.name);
      }

      if (locationValue.neighborhood) {
        const { data: neighborhoodData } = await supabase
          .from('neighborhoods')
          .select('name')
          .eq('id', locationValue.neighborhood)
          .single();
        if (neighborhoodData?.name) localStorage.setItem('userNeighborhood', neighborhoodData.name);
      }

      if (address) localStorage.setItem('userAddress', address);

      toast({
        title: "تم التسجيل بنجاح",
        description: "مرحباً بك! تم إنشاء حسابك بنجاح."
      });
      navigate("/account", { replace: true });
    } catch (err: any) {
      setErrors((prev) => ({
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

  if (authChecking) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-gray-500">جاري التحقق من رقم الهاتف...</div>
      </MainLayout>
    );
  }

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
                <Phone size={18} className="ml-2 text-gray-500" />
                <label htmlFor="phone" className="font-medium">رقم الهاتف المؤكد</label>
              </div>
              <div className="flex gap-2 items-center">
                <CountryCodeSelector
                  value={countryCode}
                  onChange={() => undefined}
                  className="min-w-[80px] pointer-events-none opacity-70"
                />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  readOnly
                  className="text-right ltr flex-1 bg-gray-50"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-green-700 mt-1">✓ تم التحقق من هذا الرقم</p>
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
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((prev) => ({ ...prev, email: "" }));
                }}
                className="text-right ltr"
                placeholder="example@domain.com"
                dir="ltr"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="firstName" className="font-medium">الاسم الأول</label>
              </div>
              <Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="text-right" />
              {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="lastName" className="font-medium">اسم العائلة</label>
              </div>
              <Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} className="text-right" />
              {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <KeyRound size={18} className="ml-2 text-gray-500" />
                <label htmlFor="password" className="font-medium">كلمة المرور</label>
              </div>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="text-right" placeholder="8 أحرف أو أكثر" />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
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
              <Textarea id="address" value={address} onChange={(event) => setAddress(event.target.value)} className="text-right resize-none" rows={3} />
            </div>

            {errors.server && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-600">{errors.server}</p>
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
