
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { toast } = useToast();
  const { user, signInWithPhone, verifyPhone } = useUser();
  
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState<Country>({ name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' });
  const [errors, setErrors] = useState({
    phone: "",
    code: ""
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
  
  const handleSendCode = async () => {
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
      console.log("Sending verification for phone:", fullPhone);
      
      const { error } = await signInWithPhone(fullPhone);
      
      if (error) {
        console.error("Error sending verification code:", error);
        throw error;
      }
      
      toast({
        title: "تم إرسال رمز التحقق",
        description: "تم إرسال رمز التحقق إلى رقم الهاتف الخاص بك"
      });
      
      setStep('verification');
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
      // Create full international format
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
      
      navigate('/account');
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
                سيتم إرسال رمز تحقق إلى رقم الهاتف الخاص بك
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
              
              <Button
                onClick={handleSendCode}
                disabled={loading}
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
                تم إرسال رمز التحقق إلى رقم الهاتف الخاص بك
                <br />
                <span className="font-bold">{countryCode.dialCode} {phone}</span>
              </p>
              
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
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => setStep('phone')}
                  className="text-primary text-sm"
                >
                  تغيير رقم الهاتف
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default PhoneVerify;
