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
  
  const formatPhoneNumber = (phoneNumber: string) => {
    return phoneNumber;
  };
  
  const handleSendCode = async () => {
    if (!phone || !phone.startsWith('+20')) {
      toast({
        title: "خطأ في رقم الهاتف",
        description: "يرجى إدخال رقم هاتف مصري يبدأ بـ +20",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await signInWithPhone(phone);
      
      if (error) {
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
      toast({
        title: "خطأ في الرمز",
        description: "يرجى إدخال الرمز المكون من 6 أرقام",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await verifyPhone(phone, code);
      
      if (error) {
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
                  placeholder="+20xxxxxxxxxx"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  أدخل رقم الهاتف مع إضافة +20 في البداية ({phone || '+20xxxxxxxxxx'})
                </p>
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
                <span className="font-bold">{formatPhoneNumber(phone)}</span>
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
                    onChange={setCode}
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
