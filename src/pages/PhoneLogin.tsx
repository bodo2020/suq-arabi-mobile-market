
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Loader, KeyRound } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { supabase } from '@/integrations/supabase/client';

const PhoneLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithPhone, signIn } = useUser();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [countryCode, setCountryCode] = useState<Country>({ name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' });
  const [errors, setErrors] = useState({
    phone: "",
    password: ""
  });
  const [isRegisteredUser, setIsRegisteredUser] = useState(false);
  const [phoneFormatted, setPhoneFormatted] = useState('');
  const [rateLimitError, setRateLimitError] = useState(false);
  const [codeForTesting, setCodeForTesting] = useState<string | null>(null);
  const [blockedNumber, setBlockedNumber] = useState(false);
  
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
  
  const checkPhoneExists = async () => {
    if (loading) return; // Prevent multiple clicks
    
    // Reset state
    setRateLimitError(false);
    setBlockedNumber(false);
    setCodeForTesting(null);
    
    const cleanPhone = formatPhoneNumber(phone, countryCode);
    
    if (!cleanPhone) {
      setErrors(prev => ({ ...prev, phone: "يرجى إدخال رقم هاتف" }));
      toast({
        title: "خطأ في رقم الهاتف",
        description: "يرجى إدخال رقم هاتف",
        variant: "destructive"
      });
      return;
    }
    
    // For Egypt, validate Egyptian phone format
    if (countryCode.code === 'EG' && !validateEgyptianPhone(cleanPhone)) {
      setErrors(prev => ({ 
        ...prev, 
        phone: "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام)"
      }));
      toast({
        title: "خطأ في رقم الهاتف",
        description: "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام)",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Create full international format
      const fullPhone = formatInternationalPhone(phone, countryCode);
      setPhoneFormatted(fullPhone);
      console.log("Checking phone:", fullPhone);
      
      // Check if the phone exists in the customers table
      const { data, error: supabaseError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', fullPhone)
        .single();
      
      if (supabaseError) {
        if (supabaseError.code === 'PGRST116') { // No rows returned
          console.log("User not found, sending verification code");
          setIsRegisteredUser(false);
          handleSendCode(fullPhone);
        } else {
          throw supabaseError;
        }
      } else {
        // User exists
        console.log("User found:", data);
        setIsRegisteredUser(true);
        setLoading(false); // Important: stop loading here
      }
      
    } catch (error: any) {
      console.error('Error checking phone:', error);
      toast({
        title: "حدث خطأ",
        description: error.message || "حدث خطأ أثناء التحقق من رقم الهاتف",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  
  const handleSendCode = async (fullPhone: string) => {
    try {
      const { data, error } = await signInWithPhone(fullPhone);
      
      if (error) {
        console.error("Error sending verification code:", error);
        
        // Check for rate limit error
        if (error.status === 429 || error.code === 'over_sms_send_rate_limit') {
          setRateLimitError(true);
          toast({
            title: "تم تجاوز الحد المسموح",
            description: "لقد تجاوزت الحد المسموح لإرسال رسائل التحقق. يرجى المحاولة مرة أخرى بعد قليل.",
            variant: "destructive"
          });
          return;
        }
        
        // Check for blocked number error from our custom function
        if (data?.blockedNumber) {
          setBlockedNumber(true);
          // If we're in development mode, show the verification code
          if (data.code) {
            setCodeForTesting(data.code);
          }
          toast({
            title: "تم حظر رقم الهاتف",
            description: "تم حظر رقم الهاتف مؤقتًا من قبل Twilio. يمكنك استخدام رمز التحقق أدناه للاختبار أو تجربة رقم آخر.",
            variant: "destructive"
          });
          return;
        }
        
        throw error;
      }
      
      // Check if we got a code for development purposes
      if (data?.code) {
        setCodeForTesting(data.code);
      }
      
      toast({
        title: "تم إرسال رمز التحقق",
        description: "تم إرسال رمز التحقق إلى واتساب الخاص بك"
      });
      
      // Navigate to verify page with the phone number
      navigate(`/phone-verify?phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(countryCode.code)}`);
      
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      toast({
        title: "حدث خطأ",
        description: error.message || "لم نتمكن من إرسال رمز التحقق، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordLogin = async () => {
    if (loginLoading) return; // Prevent multiple clicks
    
    if (!password) {
      setErrors(prev => ({ ...prev, password: "يرجى إدخال كلمة المرور" }));
      return;
    }
    
    setLoginLoading(true);
    
    try {
      // Get the email address for the phone number
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('email')
        .eq('phone', phoneFormatted)
        .single();
      
      if (fetchError || !data?.email) {
        throw new Error("لم نتمكن من العثور على بريدك الإلكتروني المرتبط برقم الهاتف");
      }
      
      const email = data.email;
      
      // Sign in with email and password
      const { error } = await signIn(email, password);
      
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
        description: error.message || "كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setLoginLoading(false);
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
                  setIsRegisteredUser(false);
                  setRateLimitError(false);
                  setBlockedNumber(false);
                  setCodeForTesting(null);
                }}
                className="text-right ltr flex-1"
                placeholder={countryCode.code === 'EG' ? "1xxxxxxxxx" : "xxx-xxxx-xxx"}
                dir="ltr"
                disabled={isRegisteredUser}
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
            
            {rateLimitError && (
              <p className="text-amber-600 text-sm mt-1">
                لقد تجاوزت الحد المسموح لإرسال رسائل التحقق. يرجى المحاولة مرة أخرى لاحقاً أو التواصل مع الدعم الفني.
              </p>
            )}
            
            {blockedNumber && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm font-medium">
                  تم حظر هذا الرقم مؤقتًا بواسطة Twilio بسبب نشاط مشبوه
                </p>
                <p className="text-red-500 text-xs mt-1">
                  يرجى استخدام رقم هاتف آخر أو التواصل مع الدعم الفني
                </p>
                {codeForTesting && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-700 text-sm font-medium">رمز التحقق للاختبار فقط:</p>
                    <p className="text-yellow-800 text-lg font-bold text-center mt-1 font-mono">{codeForTesting}</p>
                    <p className="text-yellow-600 text-xs mt-1">استخدم هذا الرمز في صفحة التحقق</p>
                    <Button
                      onClick={() => navigate(`/phone-verify?phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(countryCode.code)}&testCode=${codeForTesting}`)}
                      className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700"
                      size="sm"
                    >
                      الانتقال إلى صفحة التحقق
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {!isRegisteredUser ? (
            <Button
              onClick={checkPhoneExists}
              disabled={loading || rateLimitError}
              className="w-full"
            >
              {loading ? (
                <Loader size={16} className="animate-spin mr-2" />
              ) : null}
              المتابعة
            </Button>
          ) : (
            <div className="space-y-6">
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
                      handlePasswordLogin();
                    }
                  }}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>
              
              <Button
                onClick={handlePasswordLogin}
                disabled={loginLoading}
                className="w-full"
              >
                {loginLoading ? (
                  <Loader size={16} className="animate-spin mr-2" />
                ) : null}
                تسجيل الدخول
              </Button>
              
              <div className="flex justify-between text-sm">
                <button
                  onClick={() => {
                    setIsRegisteredUser(false);
                    setPassword('');
                  }}
                  className="text-primary"
                  type="button"
                >
                  تغيير رقم الهاتف
                </button>
                
                <button
                  onClick={() => navigate('/register')}
                  className="text-primary"
                  type="button"
                >
                  تسجيل حساب جديد
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default PhoneLogin;
