import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader, User, Send } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resetPassword } = useUser();
  
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPhoneInput, setIsPhoneInput] = useState(false);
  const [countryCode, setCountryCode] = useState<Country>({
    name: 'مصر',
    code: 'EG',
    dialCode: '+20',
    flag: '🇪🇬',
  });
  const [error, setError] = useState('');
  
  const detectInputType = (value: string) => {
    const hasDigits = /\d/.test(value);
    const hasEmailSymbol = /@/.test(value);
    setIsPhoneInput(hasDigits && !hasEmailSymbol);
  };

  const formatPhoneNumber = (phoneNumber: string, country: Country) => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (country.code === 'EG' && digits.length > 0) {
      return digits.startsWith('0') ? digits.substring(1) : digits;
    }
    return digits;
  };
  
  const validateEgyptianPhone = (phone: string) => phone.startsWith('1') && phone.length === 10;
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  const handleResetPassword = async () => {
    if (loading) return;
    setError('');
    
    if (!username.trim()) {
      setError('يرجى إدخال البريد الإلكتروني أو رقم الهاتف');
      return;
    }

    if (isPhoneInput) {
      const cleanPhone = formatPhoneNumber(username, countryCode);
      if (countryCode.code === 'EG' && !validateEgyptianPhone(cleanPhone)) {
        setError('يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام)');
        return;
      }

      navigate(
        `/phone-verify?phone=${encodeURIComponent(cleanPhone)}&countryCode=${encodeURIComponent(countryCode.code)}&mode=recovery`
      );
      return;
    }

    const email = username.trim();
    if (!validateEmail(email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    
    setLoading(true);
    try {
      const { error: resetError } = await resetPassword(email);
      if (resetError) throw resetError;
      
      setSuccess(true);
      toast({
        title: 'تم إرسال رابط إعادة تعيين كلمة المرور',
        description: 'تحقق من بريدك الإلكتروني لإكمال تغيير كلمة المرور',
      });
    } catch (resetError: any) {
      const message = resetError?.message || 'حدث خطأ ما، يرجى المحاولة مرة أخرى';
      setError(message);
      toast({
        title: 'فشل إعادة تعيين كلمة المرور',
        description: message,
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
          <h1 className="text-xl font-bold flex-1 text-center">استعادة كلمة المرور</h1>
          <div className="w-10" />
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Send size={48} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold">تم إرسال رابط إعادة تعيين كلمة المرور</h2>
              <p className="text-gray-600">تحقق من بريدك الإلكتروني واتبع الرابط لتعيين كلمة مرور جديدة.</p>
              <Button onClick={() => navigate('/phone-login')} className="w-full mt-4">
                العودة إلى تسجيل الدخول
              </Button>
            </div>
          ) : (
            <>
              <p className="text-gray-600">
                استخدم بريدك الإلكتروني لاستقبال رابط الاستعادة، أو رقم الهاتف لاستقبال رمز OTP.
              </p>
              
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
                    type="text"
                    value={username}
                    onChange={(event) => {
                      const value = event.target.value;
                      setUsername(value);
                      detectInputType(value);
                      setError('');
                    }}
                    className="text-right ltr flex-1"
                    placeholder="أدخل البريد الإلكتروني أو رقم الهاتف"
                    dir="rtl"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleResetPassword();
                    }}
                  />
                </div>
                
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              
              <Button onClick={handleResetPassword} disabled={loading} className="w-full">
                {loading && <Loader size={16} className="animate-spin ml-2" />}
                متابعة الاستعادة
              </Button>
              
              <div className="flex justify-center text-sm">
                <button onClick={() => navigate('/phone-login')} className="text-primary" type="button">
                  العودة إلى تسجيل الدخول
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ForgotPassword;
