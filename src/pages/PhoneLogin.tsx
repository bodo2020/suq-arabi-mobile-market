import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Loader, KeyRound, Mail } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PhoneLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn } = useUser();
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('phone');
  const [countryCode, setCountryCode] = useState<Country>({ name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' });
  const [errors, setErrors] = useState({
    phone: "",
    email: "",
    password: ""
  });
  
  // Format phone number based on country
  const formatPhoneNumber = (phoneNumber: string, country: Country) => {
    // First remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it's Egypt, validate it starts with 0
    if (country.code === 'EG' && digits.length > 0) {
      // If phone starts with 0, remove it for international format
      return digits.startsWith('0') ? digits.substring(1) : digits;
    }
    
    return digits;
  };

  // Format full international phone number
  const formatInternationalPhone = (phoneNumber: string, country: Country) => {
    const formattedNumber = formatPhoneNumber(phoneNumber, country);
    // Remove the + from the dial code
    const dialCode = country.dialCode.replace('+', '');
    
    return `${dialCode}${formattedNumber}`;
  };
  
  const validateEgyptianPhone = (phone: string) => {
    // For Egyptian numbers, they should start with 1 and be 10 digits
    return phone.startsWith('1') && phone.length === 10;
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  const handleLogin = async () => {
    if (loading) return; // Prevent multiple clicks
    
    // Reset all errors first
    setErrors({
      phone: "",
      email: "",
      password: ""
    });
    
    // Validate input based on login method
    let username = "";
    
    if (loginMethod === 'phone') {
      const cleanPhone = formatPhoneNumber(phone, countryCode);
      
      if (!cleanPhone) {
        setErrors(prev => ({ ...prev, phone: "يرجى إدخال رقم هاتف" }));
        return;
      }
      
      // For Egypt, validate Egyptian phone format
      if (countryCode.code === 'EG' && !validateEgyptianPhone(cleanPhone)) {
        setErrors(prev => ({ 
          ...prev, 
          phone: "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام)"
        }));
        return;
      }
      
      username = formatInternationalPhone(phone, countryCode);
    } else {
      if (!email) {
        setErrors(prev => ({ ...prev, email: "يرجى إدخال البريد الإلكتروني" }));
        return;
      }
      
      if (!validateEmail(email)) {
        setErrors(prev => ({ ...prev, email: "يرجى إدخال بريد إلكتروني صحيح" }));
        return;
      }
      
      username = email;
    }
    
    if (!password) {
      setErrors(prev => ({ ...prev, password: "يرجى إدخال كلمة المرور" }));
      return;
    }
    
    setLoading(true);
    
    try {
      // Sign in with username (email or phone) and password
      const { error } = await signIn(username, password);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك مجدداً!"
      });
      
      navigate('/account');
      
    } catch (error: any) {
      console.error('Error signing in:', error);
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message || "كلمة المرور أو بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">
            تسجيل الدخول
          </h1>
          <div className="w-10"></div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-6">
          <Tabs defaultValue="phone" onValueChange={setLoginMethod}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="phone">رقم الهاتف</TabsTrigger>
              <TabsTrigger value="email">البريد الإلكتروني</TabsTrigger>
            </TabsList>
            
            <TabsContent value="phone">
              <div>
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
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors(prev => ({ ...prev, phone: "" }));
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
                
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="email">
              <div>
                <div className="flex items-center mb-2">
                  <Mail size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="email" className="font-medium">البريد الإلكتروني</label>
                </div>
                
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: "" }));
                  }}
                  className="text-right ltr"
                  placeholder="example@domain.com"
                  dir="ltr"
                />
                
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div>
            <div className="flex items-center mb-2">
              <KeyRound size={18} className="ml-2 text-gray-500" />
              <label htmlFor="password" className="font-medium">كلمة المرور</label>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors(prev => ({ ...prev, password: "" }));
              }}
              className="text-right"
              placeholder="*********"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>
              
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader size={16} className="animate-spin mr-2" />
            ) : null}
            تسجيل الدخول
          </Button>
              
          <div className="flex justify-center text-sm">
            <button
              onClick={() => navigate('/register')}
              className="text-primary"
              type="button"
            >
              تسجيل حساب جديد
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PhoneLogin;
