
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Check, Loader } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const PhoneVerify = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSendCode = async () => {
    // Validate phone number (simple Egyptian format check)
    if (!phone || !/^01\d{9}$/.test(phone)) {
      toast({
        title: "خطأ في رقم الهاتف",
        description: "يرجى إدخال رقم هاتف مصري صحيح (01xxxxxxxxx)",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Format phone number for international use
      const formattedPhone = `+2${phone}`;
      
      // Call the edge function to send the verification code
      const result = await supabase.functions.invoke('phone-verify', {
        body: { action: 'send', phone: formattedPhone }
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      toast({
        title: "تم إرسال رمز التحقق",
        description: "تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك"
      });
      
      setStep('verification');
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast({
        title: "حدث خطأ",
        description: "لم نتمكن من إرسال رمز التحقق، يرجى المحاولة مرة أخرى",
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
      const formattedPhone = `+2${phone}`;
      
      // Call the edge function to verify the code
      const result = await supabase.functions.invoke('phone-verify', {
        body: { action: 'verify', phone: formattedPhone, code }
      });
      
      if (result.error || !result.data?.success) {
        throw new Error(result.error || 'Invalid verification code');
      }
      
      // If verification is successful and user is logged in, update their phone number
      if (user) {
        await supabase
          .from('customers')
          .update({ phone })
          .eq('user_id', user.id);
        
        toast({
          title: "تم التحقق بنجاح",
          description: "تم التحقق من رقم هاتفك بنجاح وتحديث بياناتك"
        });
      } else {
        toast({
          title: "تم التحقق بنجاح",
          description: "تم التحقق من رقم هاتفك بنجاح"
        });
      }
      
      navigate('/account');
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: "حدث خطأ",
        description: "الرمز غير صحيح أو منتهي الصلاحية",
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
                سيتم إرسال رمز تحقق إلى رقم الواتساب الخاص بك
              </p>
              
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <Phone size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-right"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
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
                تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك
                <br />
                <span className="font-bold">+2{phone}</span>
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
