import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User, Phone, MapPin, Mail, KeyRound, Map } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LocationPicker, { LocationValue } from "@/components/ui/LocationPicker";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const Register = () => {
  const navigate = useNavigate();
  const { signInWithPhone, verifyPhone } = useUser();
  const { toast } = useToast();
  
  const [phone, setPhone] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<LocationValue>({
    governorate: "",
    city: "",
    area: "",
    neighborhood: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({
    phone: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    location: "",
    server: ""
  });

  const formatPhoneNumber = (phoneNumber: string) => {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    const cleanPhone = digitsOnly.startsWith('0') ? digitsOnly.substring(1) : digitsOnly;
    
    if (cleanPhone.length === 10) {
      return `+20${cleanPhone}`;
    } else {
      return cleanPhone.startsWith('20') ? `+${cleanPhone}` : `+20${cleanPhone}`;
    }
  };

  const handleSendVerification = async () => {
    if (!phone.trim()) {
      setErrors(prev => ({ ...prev, phone: "رقم الهاتف مطلوب" }));
      return;
    }

    if (!/^01\d{9}$/.test(phone)) {
      setErrors(prev => ({ ...prev, phone: "يرجى إدخال رقم هاتف مصري صحيح (01xxxxxxxxx)" }));
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signInWithPhone(phone);
      
      if (error) {
        throw new Error(error.message || "حدث خطأ أثناء إرسال رمز التحقق");
      }
      
      setIsVerifying(true);
      toast({
        title: "تم إرسال رمز التحقق",
        description: "تم إرسال رمز التحقق إلى رقم الهاتف الخاص بك",
      });
    } catch (err: any) {
      toast({
        title: "خطأ في إرسال رمز التحقق",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رمز التحقق المكون من 6 أرقام",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await verifyPhone(phone, verificationCode);
      
      if (error) {
        throw new Error(error.message || "الرمز غير صحيح أو منتهي الصلاحية");
      }
      
      setIsVerified(true);
      setIsVerifying(false);
      toast({
        title: "تم التحقق بنجاح",
        description: "يمكنك الآن إكمال عملية التسجيل",
      });
    } catch (err: any) {
      toast({
        title: "خطأ في التحقق",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors(prev => ({ ...prev, server: "" }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        phone: formatPhoneNumber(phone),
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone, // Store local format in metadata
            name: `${firstName} ${lastName}`.trim(),
            address,
            location
          }
        }
      });

      if (error) throw error;

      toast({
        title: "تم التسجيل بنجاح",
        description: "مرحباً بك! تم تسجيل حسابك بنجاح.",
      });

      navigate("/account");
    } catch (err: any) {
      setErrors(prev => ({
        ...prev,
        server: err?.message || "حدث خطأ أثناء التسجيل"
      }));
      toast({
        title: "خطأ في التسجيل",
        description: err?.message || "حدث خطأ أثناء التسجيل",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      phone: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      location: "",
      server: ""
    };

    if (!firstName.trim()) {
      newErrors.firstName = "الاسم الأول مطلوب";
      valid = false;
    }
    if (!lastName.trim()) {
      newErrors.lastName = "اسم العائلة مطلوب";
      valid = false;
    }
    if (!email.trim() || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email.trim())) {
      newErrors.email = "يرجى إدخال بريد إلكتروني صحيح";
      valid = false;
    }
    if (!password || password.length < 6) {
      newErrors.password = "كلمة المرور يجب أن تكون 6 أحرف أو أكثر";
      valid = false;
    }
    if (!location.governorate || !location.city || !location.area) {
      newErrors.location = "يرجى اختيار المحافظة والمدينة والمنطقة";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  return (
    <MainLayout>
      <div className="py-4 px-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تسجيل مستخدم جديد</h1>
          <div className="w-10" />
        </div>

        {!isVerified ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <Phone size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                      setPhone(value);
                      setErrors(prev => ({ ...prev, phone: "" }));
                    }
                  }}
                  className="text-right ltr"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  سيتم إضافة +20 تلقائياً ({formatPhoneNumber(phone || '01xxxxxxxxx')})
                </p>
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
              <Button
                onClick={handleSendVerification}
                disabled={isSubmitting}
                className="w-full bg-primary text-white"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : "إرسال رمز التحقق"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <User size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="firstName" className="font-medium">الاسم الأول</label>
                </div>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="text-right"
                  placeholder="أدخل الاسم الأول"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <User size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="lastName" className="font-medium">اسم العائلة</label>
                </div>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="text-right"
                  placeholder="أدخل اسم العائلة"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <Mail size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="email" className="font-medium">البريد الإلكتروني</label>
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-right ltr"
                  placeholder="you@example.com"
                  dir="ltr"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <Map size={18} className="ml-2 text-gray-500" />
                  <label className="font-medium">الموقع</label>
                </div>
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <MapPin size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="address" className="font-medium">تفاصيل العنوان</label>
                </div>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-right resize-none"
                  placeholder="اكتب تفاصيل عنوانك هنا"
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <KeyRound size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="password" className="font-medium">كلمة المرور</label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-right"
                  placeholder="******"
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white py-3"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : "تسجيل"}
            </Button>
          </form>
        )}

        <Dialog open={isVerifying} onOpenChange={setIsVerifying}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center mb-4">أدخل رمز التحقق</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              <p className="text-sm text-gray-500 text-center">
                تم إرسال رمز التحقق إلى رقم الهاتف الخاص بك
                <br />
                <span className="font-bold">{formatPhoneNumber(phone)}</span>
              </p>
              <InputOTP
                value={verificationCode}
                onChange={setVerificationCode}
                maxLength={6}
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
              <Button
                onClick={handleVerifyCode}
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full bg-primary text-white py-3"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : "تحقق"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Register;
