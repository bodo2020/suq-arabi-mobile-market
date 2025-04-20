// This page implements signup & registration functionality integrated with Supabase Auth and customer data saving

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Phone, MapPin, Mail } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });

  const validate = () => {
    let valid = true;
    const newErrors = {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      passwordConfirm: '',
    };

    if (!firstName.trim()) {
      newErrors.firstName = 'الاسم الأول مطلوب';
      valid = false;
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'اسم العائلة مطلوب';
      valid = false;
    }
    if (!phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
      valid = false;
    } else if (!/^\d{10,11}$/.test(phone.trim())) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
      valid = false;
    }
    if (!email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
      valid = false;
    }
    if (password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      valid = false;
    }
    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'كلمتا المرور غير متطابقتين';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Sign up with Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            address: address,
          },
        },
      });
      if (error) throw error;

      // If signUp does not auto login, you might need to log in manually here
      // Sign in after signup to establish session for redirect
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      toast({
        title: 'تم التسجيل بنجاح',
        description: 'تم إنشاء الحساب وتسجيل الدخول',
      });

      navigate('/account');
    } catch (error: any) {
      console.error('Error during signup:', error);
      toast({
        title: 'خطأ في التسجيل',
        description: error.message || 'حدث خطأ أثناء التسجيل',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <MainLayout>
      <div className="py-4">
        <div className="flex items-center mb-6">
          <button onClick={handleBack} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تسجيل مستخدم جديد</h1>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg p-4">
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
                className={`w-full p-3 border rounded-lg text-right ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
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
                className={`w-full p-3 border rounded-lg text-right ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
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
                className={`w-full p-3 border rounded-lg text-right ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل رقم الهاتف"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

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
                className={`w-full p-3 border rounded-lg text-right ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل بريدك الإلكتروني"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="address" className="font-medium">العنوان</label>
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

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="password" className="font-medium">كلمة المرور</label>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل كلمة المرور"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="passwordConfirm" className="font-medium">تأكيد كلمة المرور</label>
              </div>
              <input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.passwordConfirm ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل تأكيد كلمة المرور"
              />
              {errors.passwordConfirm && <p className="text-red-500 text-sm mt-1">{errors.passwordConfirm}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'تسجيل'
            )}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default Register;
