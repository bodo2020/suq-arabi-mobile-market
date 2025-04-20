
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User, Phone, MapPin, LogIn, UserPlus, Mail, KeyRound } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<"register" | "login">("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    server: ""
  });

  // Validation functions
  const validateRegister = () => {
    let valid = true;
    const newErrors = {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
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
    // Egyptian phone numbers: 01xxxxxxxxx
    if (!/^01\d{9}$/.test(phone.trim())) {
      newErrors.phone = "رقم الهاتف غير صحيح (يجب أن يكون مصريا من 11 رقم)";
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const validateLogin = () => {
    let valid = true;
    const newErrors = {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      server: ""
    };
    if (!email.trim() || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email.trim())) {
      newErrors.email = "يرجى إدخال بريد إلكتروني صحيح";
      valid = false;
    }
    if (!password || password.length < 6) {
      newErrors.password = "كلمة المرور يجب أن تكون 6 أحرف أو أكثر";
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  // Registration handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, server: "" }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone.trim(),
            name: `${firstName} ${lastName}`.trim(),
            address
          }
        }
      });
      if (error) throw error;

      toast({
        title: "تم التسجيل بنجاح",
        description: "تم إرسال بريد التفعيل. يرجى تفعيل بريدك الإلكتروني.",
      });
      // Optionally navigate to login
      setMode("login");
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        server: err?.message || "حدث خطأ أثناء التسجيل"
      }));
      toast({
        title: "خطأ أثناء التسجيل",
        description: err?.message || "حدث خطأ أثناء التسجيل",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, server: "" }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;

      toast({
        title: "تم تسجيل الدخول",
        description: "مرحبا بك!",
      });

      navigate("/account");
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        server: err?.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة"
      }));
      toast({
        title: "خطأ أثناء تسجيل الدخول",
        description: err?.message || "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const switchMode = () => {
    setMode(mode === "register" ? "login" : "register");
    setErrors({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      server: ""
    });
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setAddress("");
  };

  return (
    <MainLayout>
      <div className="py-4 px-0 max-w-md mx-auto hide-scrollbar">
        <div className="flex justify-center mb-8">
          <button
            className={`flex-1 py-2 border-b-2 transition-all flex items-center justify-center gap-2 text-base font-bold
              ${mode === "login" ? "border-primary text-primary" : "border-transparent text-gray-400"}`}
            onClick={() => switchMode()}
            type="button"
          >
            <LogIn /> تسجيل الدخول
          </button>
          <button
            className={`flex-1 py-2 border-b-2 transition-all flex items-center justify-center gap-2 text-base font-bold
              ${mode === "register" ? "border-primary text-primary" : "border-transparent text-gray-400"}`}
            onClick={() => switchMode()}
            type="button"
          >
            <UserPlus /> إنشاء حساب
          </button>
        </div>

        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">
            {mode === "register" ? "تسجيل مستخدم جديد" : "تسجيل الدخول"}
          </h1>
          <div className="w-10" />
        </div>

        <form onSubmit={mode === "register" ? handleRegister : handleLogin} className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            {mode === "register" && (
              <>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <User size={18} className="ml-2 text-gray-500" />
                    <label htmlFor="firstName" className="font-medium">الاسم الأول</label>
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full p-3 border rounded-lg text-right ${errors.firstName ? "border-red-500" : "border-gray-300"}`}
                    placeholder="أدخل الاسم الأول"
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <User size={18} className="ml-2 text-gray-500" />
                    <label htmlFor="lastName" className="font-medium">اسم العائلة</label>
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full p-3 border rounded-lg text-right ${errors.lastName ? "border-red-500" : "border-gray-300"}`}
                    placeholder="أدخل اسم العائلة"
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <Phone size={18} className="ml-2 text-gray-500" />
                    <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full p-3 border rounded-lg text-right ${errors.phone ? "border-red-500" : "border-gray-300"}`}
                    placeholder="01xxxxxxxxx"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
              </>
            )}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Mail size={18} className="ml-2 text-gray-500" />
                <label htmlFor="email" className="font-medium">البريد الإلكتروني</label>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.email ? "border-red-500" : "border-gray-300"}`}
                placeholder="you@email.com"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <KeyRound size={18} className="ml-2 text-gray-500" />
                <label htmlFor="password" className="font-medium">كلمة المرور</label>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.password ? "border-red-500" : "border-gray-300"}`}
                placeholder="******"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
            {mode === "register" && (
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <MapPin size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="address" className="font-medium">العنوان (اختياري)</label>
                </div>
                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-right"
                  placeholder="أدخل عنوانك"
                  rows={3}
                />
              </div>
            )}
            {errors.server && (
              <div className="my-2 text-red-600 text-sm">{errors.server}</div>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : mode === "register" ? "سجّل الآن" : "دخول"}
          </button>
        </form>

        <div className="my-4 text-center">
          <button
            onClick={switchMode}
            className="text-sm text-primary underline mt-1"
          >
            {mode === "register"
              ? "لديك حساب بالفعل؟ تسجيل الدخول"
              : "ليس لديك حساب؟ إنشاء حساب جديد"}
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Register;
