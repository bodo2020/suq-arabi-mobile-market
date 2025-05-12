
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader, User, Send } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { supabase } from '@/lib/supabase';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resetPassword } = useUser();
  
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPhoneInput, setIsPhoneInput] = useState(false);
  const [countryCode, setCountryCode] = useState<Country>({ name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' });
  const [error, setError] = useState("");
  
  // Detect if input is likely a phone number
  const detectInputType = (value: string) => {
    // Simple detection: if it has digits and no @ symbol, likely a phone
    const hasDigits = /\d/.test(value);
    const hasEmailSymbol = /@/.test(value);
    setIsPhoneInput(hasDigits && !hasEmailSymbol);
  };

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
  
  // Renamed from resetPassword to findUserEmail to avoid conflict
  const findUserEmail = async (username: string) => {
    try {
      // Check if username is email or phone
      const isEmail = username.includes('@');
      const resetEmail = isEmail ? username : username;
      
      // If it's a phone number, we need to query the user's email from the database
      if (!isEmail) {
        // Format the phone number for consistency
        const formattedPhone = formatInternationalPhone(username, countryCode);
        
        // Look up the user by phone number from customers table
        const { data: customerData } = await supabase
          .from('customers')
          .select('user_id')
          .eq('phone', formattedPhone)
          .single();
          
        if (customerData?.user_id) {
          // If we found a user with this phone, get their email
          const { data: userData } = await supabase.auth.admin.getUserById(
            customerData.user_id
          );
          
          if (userData?.user?.email) {
            // Use the retrieved email
            return userData.user.email;
          }
        }
      }
      
      return resetEmail;
    } catch (error) {
      console.error("Error finding user for password reset:", error);
      throw error;
    }
  };

  const handleResetPassword = async () => {
    if (loading) return; // Prevent multiple clicks
    
    // Reset error
    setError("");
    
    // Validate input
    if (!username) {
      setError("يرجى إدخال البريد الإلكتروني أو رقم الهاتف");
      return;
    }
    
    let resetUsername = username;
    
    // If it looks like a phone number, validate and format it
    if (isPhoneInput) {
      const cleanPhone = formatPhoneNumber(username, countryCode);
      
      // For Egypt, validate Egyptian phone format
      if (countryCode.code === 'EG' && !validateEgyptianPhone(cleanPhone)) {
        setError("يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام)");
        return;
      }
      
      resetUsername = formatInternationalPhone(username, countryCode);
    } else if (!validateEmail(username)) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    
    setLoading(true);
    
    try {
      // Try to find the email associated with the phone number
      if (isPhoneInput) {
        try {
          const email = await findUserEmail(resetUsername);
          resetUsername = email;
        } catch (error) {
          console.error('Error finding email for phone:', error);
          // Continue with the phone number if email lookup fails
        }
      }
      
      // Request password reset
      const { error } = await resetPassword(resetUsername);
      
      if (error) {
        throw error;
      }
      
      // Display success message
      setSuccess(true);
      toast({
        title: "تم إرسال رابط إعادة تعيين كلمة المرور",
        description: "يرجى التحقق من بريدك الإلكتروني أو رسائل هاتفك"
      });
      
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "فشل إعادة تعيين كلمة المرور",
        description: error.message || "حدث خطأ ما، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
      setError(error.message || "حدث خطأ ما، يرجى المحاولة مرة أخرى");
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
            استعادة كلمة المرور
          </h1>
          <div className="w-10"></div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Send size={48} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold">تم إرسال رابط إعادة تعيين كلمة المرور</h2>
              <p className="text-gray-600">
                يرجى التحقق من بريدك الإلكتروني أو رسائل هاتفك للحصول على تعليمات إعادة تعيين كلمة المرور
              </p>
              <Button
                onClick={() => navigate('/phone-login')}
                className="w-full mt-4"
              >
                العودة إلى تسجيل الدخول
              </Button>
            </div>
          ) : (
            <>
              <p className="text-gray-600">
                أدخل البريد الإلكتروني أو رقم الهاتف المرتبط بحسابك وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
              </p>
              
              <div>
                <div className="flex items-center mb-2">
                  <User size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="username" className="font-medium">البريد الإلكتروني أو رقم الهاتف</label>
                </div>
                
                <div className="flex gap-2 items-center">
                  {isPhoneInput && (
                    <CountryCodeSelector 
                      value={countryCode}
                      onChange={setCountryCode}
                      className="min-w-[80px]"
                    />
                  )}
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      const value = e.target.value;
                      setUsername(value);
                      detectInputType(value);
                      setError("");
                    }}
                    className="text-right ltr flex-1"
                    placeholder="أدخل بريدك الإلكتروني أو رقم الهاتف"
                    dir="rtl"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleResetPassword();
                      }
                    }}
                  />
                </div>
                
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {isPhoneInput
                    ? (countryCode.code === 'EG' 
                        ? 'أدخل رقم الهاتف المصري الذي يبدأ بـ 1 (مثال: 1xxxxxxxxx)' 
                        : 'أدخل رقم الهاتف بدون رمز الدولة')
                    : 'أدخل البريد الإلكتروني الخاص بك'}
                </p>
                
                {error && (
                  <p className="text-red-500 text-sm mt-1">{error}</p>
                )}
              </div>
              
              <Button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader size={16} className="animate-spin ml-2" />
                ) : null}
                إعادة تعيين كلمة المرور
              </Button>
              
              <div className="flex justify-center text-sm">
                <button
                  onClick={() => navigate('/phone-login')}
                  className="text-primary"
                  type="button"
                >
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
