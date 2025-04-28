
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Check, Loader } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';

const PhoneVerify = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signInWithPhone, verifyPhone } = useUser();
  
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    phone: "",
    code: ""
  });
  
  const formatPhoneNumber = (phoneNumber: string) => {
    // Strip ALL non-digit characters completely
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If the number starts with "01", add "+2" prefix
    if (digits.startsWith('01')) {
      return "+2" + digits;
    }
    
    return digits;
  };
  
  const handleSendCode = async () => {
    // First strip any non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!cleanPhone) {
      setErrors(prev => ({ ...prev, phone: "يرجى إدخال رقم هاتف مصري" }));
      toast({
        title: "خطأ في رقم الهاتف",
        description: "يرجى إدخال رقم هاتف مصري يبدأ بـ 01",
        variant: "destructive"
      });
      return;
    }
    
    // Validate that the phone starts with 01 and has correct length
    if (!cleanPhone.startsWith('01') || cleanPhone.length !== 11) {
      setErrors(prev => ({ ...prev, phone: "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01 (11 رقم)" }));
      toast({
        title: "خطأ في رقم الهاتف",
        description: "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01 (11 رقم)",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("Sending verification for phone:", phone);
      const { error } = await signInWithPhone(phone);
      
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
      console.log("Verifying code for phone:", phone);
      const { error } = await verifyPhone(phone, code);
      
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
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErrors(prev => ({ ...prev, phone: "" }));
                  }}
                  className="text-right ltr"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  أدخل رقم الهاتف المصري الذي يبدأ بـ 01 ({phone || '01xxxxxxxxx'})
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
                <span className="font-bold">{phone}</span>
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
