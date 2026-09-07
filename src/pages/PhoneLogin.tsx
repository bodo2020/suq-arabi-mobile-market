import BrandLoader from '@/components/ui/BrandLoader';
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader, KeyRound, User } from 'lucide-react';
import MainLayout from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/auth/PasswordInput';
import { authErrorMessage, localPhoneDigits, normalizeDigits } from '@/utils/authUi';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';

const PhoneLogin = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = ['/cart', '/payment', '/addresses', '/add-address', '/account'].includes(params.get('returnTo') || '') ? params.get('returnTo')! : '/';
  const { toast } = useToast();
  const { signIn } = useUser();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPhoneInput, setIsPhoneInput] = useState(false);
  const [countryCode, setCountryCode] = useState<Country>({ name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' });
  const [errors, setErrors] = useState({ username: '', password: '' });
  
  const detectInputType = (value: string) => {
    const hasDigits = /^[+\d\s()-]+$/.test(normalizeDigits(value.trim()));
    const hasEmailSymbol = /@/.test(value);
    setIsPhoneInput(hasDigits && !hasEmailSymbol);
  };

  const formatPhoneNumber = (phoneNumber: string, country: Country) => {
    const digits = localPhoneDigits(phoneNumber, country.dialCode, country.code);
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
  
  const validateEgyptianPhone = (phone: string) => phone.startsWith('1') && phone.length === 10;
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  const handleLogin = async () => {
    if (loading) return;
    setErrors({ username: '', password: '' });
    
    if (!username) {
      setErrors((prev) => ({ ...prev, username: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف' }));
      return;
    }
    
    let loginUsername = username.trim();
    
    if (isPhoneInput) {
      const cleanPhone = formatPhoneNumber(username, countryCode);
      if (countryCode.code === 'EG' && !validateEgyptianPhone(cleanPhone)) {
        setErrors((prev) => ({
          ...prev,
          username: 'يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام)',
        }));
        return;
      }
      loginUsername = formatInternationalPhone(username, countryCode);
    } else if (!validateEmail(loginUsername)) {
      setErrors((prev) => ({ ...prev, username: 'يرجى إدخال بريد إلكتروني صحيح' }));
      return;
    }
    
    if (!password) {
      setErrors((prev) => ({ ...prev, password: 'يرجى إدخال كلمة المرور' }));
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await signIn(loginUsername, password);
      if (error) throw error;
      
      toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: 'مرحباً بك مجدداً!',
      });
      navigate(returnTo);
    } catch (error: any) {
      toast({
        title: 'فشل تسجيل الدخول',
        description: authErrorMessage(error, 'تعذر الدخول. راجع بياناتك واتصال الإنترنت وحاول مرة أخرى.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تسجيل الدخول</h1>
          <div className="w-10" />
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="username" className="font-medium">البريد الإلكتروني أو رقم الهاتف</label>
              </div>
              
              <div className="flex gap-2 items-center">
                {isPhoneInput && (
                  <CountryCodeSelector value={countryCode} onChange={setCountryCode} className="min-w-[80px]" />
                )}
                <Input
                  id="username"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.username)}
                  type="text"
                  value={username}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUsername(value);
                    detectInputType(value);
                    setErrors((prev) => ({ ...prev, username: '' }));
                  }}
                  className="text-right ltr flex-1"
                  placeholder="أدخل بريدك الإلكتروني أو رقم الهاتف"
                  dir="rtl"
                />
              </div>
              
              <p className="text-xs text-gray-500 mt-1 text-right">
                {isPhoneInput
                  ? (countryCode.code === 'EG'
                      ? 'أدخل رقم الهاتف المصري الذي يبدأ بـ 1 (مثال: 1xxxxxxxxx)'
                      : 'أدخل رقم الهاتف بدون رمز الدولة')
                  : 'أدخل البريد الإلكتروني الخاص بك'}
              </p>
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>
            
            <div>
              <div className="flex items-center mb-2">
                <KeyRound size={18} className="ml-2 text-gray-500" />
                <label htmlFor="password" className="font-medium">كلمة المرور</label>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((prev) => ({ ...prev, password: '' }));
                }}
                className="text-right"
                placeholder="أدخل كلمة المرور"
                dir="rtl"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleLogin();
                }}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              
              <div className="flex justify-end mt-1">
                <button onClick={() => navigate('/forgot-password')} className="text-sm text-primary hover:underline" type="button">
                  نسيت كلمة المرور؟
                </button>
              </div>
            </div>
          </div>
              
          <Button onClick={handleLogin} disabled={loading} className="w-full">
            {loading && <BrandLoader size="sm" className="ml-2" />}
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </Button>
              
          <div className="flex justify-center text-sm">
            <span className="text-gray-500 ml-2">ليس لديك حساب؟</span>
            <button onClick={() => navigate('/phone-verify')} className="text-primary" type="button">
              تسجيل حساب جديد
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PhoneLogin;
