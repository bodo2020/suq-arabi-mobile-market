
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, ArrowRight, Check, Loader } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';

const PhoneVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signInWithPhone, verifyPhone } = useUser();
  
  const queryParams = new URLSearchParams(location.search);
  const phoneFromQuery = queryParams.get('phone') || '';
  const countryCodeFromQuery = queryParams.get('countryCode') || 'EG';
  const testCodeFromQuery = queryParams.get('testCode') || '';
  
  const [phone, setPhone] = useState(phoneFromQuery);
  const [step, setStep] = useState<'phone' | 'verification'>(phoneFromQuery ? 'verification' : 'phone');
  const [code, setCode] = useState(testCodeFromQuery);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [blockedNumber, setBlockedNumber] = useState(false);
  const [codeForTesting, setCodeForTesting] = useState<string | null>(testCodeFromQuery || null);
  const [countryCode, setCountryCode] = useState<Country>(() => {
    const countries = [
      { name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
      { name: 'السعودية', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
      { name: 'الإمارات', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
      // ... keep existing code (other countries)
    ];
    return countries.find(c => c.code === countryCodeFromQuery) || 
      { name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' };
  });
  const [errors, setErrors] = useState({
    phone: "",
    code: ""
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
  
  const handleSendCode = async () => {
    const cleanPhone = formatPhoneNumber(phone, countryCode);
    
    // Reset state
    setRateLimitError(false);
    setBlockedNumber(false);
    setCodeForTesting(null);
    
    if (!cleanPhone) {
      setErrors(prev => ({ ...prev, phone: "يرجى إدخال رقم هاتف" }));
      toast({
        title: "خطأ في رقم الهاتف",
        description: "يرجى إدخال رقم هاتف",
        variant: "destructive"
      });
      return;
    }
    
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
      const fullPhone = formatInternationalPhone(phone, countryCode);
      console.log("Sending verification for phone:", fullPhone);
      
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
          throw error;
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
            description: "تم حظر رقم الهاتف مؤقتًا من قبل Twilio. يمكنك استخدام رمز التحقق أدناه للاختبار.",
            variant: "destructive"
          });
          setStep('verification');
          setLoading(false);
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
        description: data?.message || "تم إرسال رمز التحقق عبر واتساب"
      });
      
      setStep('verification');
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      
      if (!error.status || error.status !== 429) {
        toast({
          title: "حدث خطأ",
          description: error.message || "لم نتمكن من إرسال رمز التحقق، يرجى المحاولة مرة أخرى",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendCode = async () => {
    if (resendLoading) return;
    
    setResendLoading(true);
    setRateLimitError(false);
    setBlockedNumber(false);
    setCodeForTesting(null);
    
    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      console.log("Resending verification for phone:", fullPhone);
      
      const { data, error } = await signInWithPhone(fullPhone);
      
      if (error) {
        console.error("Error resending verification code:", error);
        
        // Check for rate limit error
        if (error.status === 429 || error.code === 'over_sms_send_rate_limit') {
          setRateLimitError(true);
          toast({
            title: "تم تجاوز الحد المسموح",
            description: "لقد تجاوزت الحد المسموح لإرسال رسائل التحقق. يرجى المحاولة مرة أخرى بعد قليل.",
            variant: "destructive"
          });
          throw error;
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
            description: "تم حظر رقم الهاتف مؤقتًا من قبل Twilio. يمكنك استخدام رمز التحقق أدناه للاختبار.",
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
        title: "تم إعادة إرسال رمز التحقق",
        description: data?.message || "تم إرسال رمز التحقق عبر واتساب"
      });
      
    } catch (error: any) {
      console.error('Error resending verification code:', error);
      
      if (!error.status || error.status !== 429) {
        toast({
          title: "حدث خطأ",
          description: error.message || "لم نتمكن من إرسال رمز التحقق، يرجى المحاولة مرة أخرى",
          variant: "destructive"
        });
      }
    } finally {
      setResendLoading(false);
    }
  };
  
  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setErrors(prev => ({ ...prev, code: "يرجى إدخال الرمز المكون من 6 أرقام" }));
      toast({
        title: "خطأ في الرمز",
        description: "يرجى إدخال الرمز المكون من 6 أرقام",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      console.log("Verifying code for phone:", fullPhone);
      
      const { error } = await verifyPhone(fullPhone, code);
      
      if (error) {
        console.error("Error verifying code:", error);
        throw error;
      }
      
      toast({
        title: "تم التحقق بنجاح",
        description: "تم التحقق من رقم هاتفك بنجاح"
      });
      
      if (!user) {
        navigate(`/register?phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(countryCode.code)}&verified=true`);
      } else {
        navigate('/account');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        title: "حدث خطأ",
        description: error.message || "الرمز غير صحيح أو منتهي الصلاحية",
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
            التحقق من رقم الهاتف
          </h1>
          <div className="w-10"></div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          {step === 'phone' ? (
            <>
              <p className="text-center mb-6">
                سيتم إرسال رمز التحقق عبر واتساب
              </p>
              
              <div className="mb-6">
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
                      setRateLimitError(false);
                      setBlockedNumber(false);
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
                
                {rateLimitError && (
                  <p className="text-amber-600 text-sm mt-1">
                    لقد تجاوزت الحد المسموح لإرسال رسائل التحقق. يرجى المحاولة مرة أخرى لاحقاً أو التواصل مع الدعم الفني.
                  </p>
                )}
              </div>
              
              <Button
                onClick={handleSendCode}
                disabled={loading || rateLimitError}
                className="w-full"
              >
                {loading ? (
                  <Loader size={16} className="animate-spin mr-2" />
                ) : null}
                إرسال رمز التحقق
              </Button>
            </>
          ) : (
            <>
              <p className="text-center mb-6">
                تم إرسال رمز التحقق عبر واتساب إلى
                <br />
                <span className="font-bold">{countryCode.dialCode} {phone}</span>
              </p>
              
              {blockedNumber && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm font-medium">
                    تم حظر هذا الرقم مؤقتًا بواسطة Twilio بسبب نشاط مشبوه
                  </p>
                  <p className="text-red-500 text-xs mt-1">
                    يرجى استخدام رقم هاتف آخر أو التواصل مع الدعم الفني
                  </p>
                </div>
              )}
              
              {codeForTesting && (
                <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-700 text-sm font-medium">رمز التحقق للتطوير:</p>
                  <p className="text-yellow-800 text-lg font-bold text-center mt-1 font-mono">{codeForTesting}</p>
                  <p className="text-yellow-600 text-xs mt-1">يظهر هذا الرمز فقط في بيئة التطوير أو عند فشل إرسال الرسالة عبر واتساب</p>
                </div>
              )}
              
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <Check size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="code" className="font-medium">رمز التحقق</label>
                </div>
                <div className="flex justify-center mb-4">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => {
                      setCode(value);
                      setErrors(prev => ({ ...prev, code: "" }));
                    }}
                    dir="ltr"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {errors.code && (
                  <p className="text-red-500 text-sm mt-1 text-center">{errors.code}</p>
                )}
              </div>
              
              <Button
                onClick={handleVerifyCode}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader size={16} className="animate-spin mr-2" />
                ) : null}
                التحقق من الرمز
              </Button>
              
              <div className="mt-4 text-center space-y-2">
                <button
                  onClick={handleResendCode}
                  className={`text-primary text-sm ${
                    resendLoading || rateLimitError ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={resendLoading || rateLimitError}
                >
                  {resendLoading ? "جاري إعادة الإرسال..." : "إعادة إرسال الرمز"}
                </button>
                
                {rateLimitError && (
                  <p className="text-amber-600 text-sm">
                    لقد تجاوزت الحد المسموح لإرسال رسائل التحقق. يرجى المحاولة مرة أخرى لاحقاً.
                  </p>
                )}
                
                <div>
                  <button
                    onClick={() => setStep('phone')}
                    className="text-primary text-sm"
                  >
                    تغيير رقم الهاتف
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default PhoneVerify;
