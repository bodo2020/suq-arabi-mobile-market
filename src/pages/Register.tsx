
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Phone, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
  });

  const handleBack = () => {
    navigate(-1);
  };

  const validate = () => {
    const newErrors = {
      name: '',
      phone: '',
    };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'الاسم مطلوب';
      isValid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
      isValid = false;
    } else if (!/^\d{10,11}$/.test(phone.trim())) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // In a real app, this would be an API call
    // For now, just store in localStorage
    localStorage.setItem('userName', name);
    localStorage.setItem('userPhone', phone);
    if (address) {
      localStorage.setItem('userAddress', address);
    }

    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/account');
    }, 1000);
  };

  return (
    <MainLayout>
      <div className="py-4">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تسجيل البيانات</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="name" className="font-medium">الاسم</label>
              </div>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل اسمك"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Phone size={18} className="ml-2 text-gray-500" />
                <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
              </div>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل رقم هاتفك"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="address" className="font-medium">العنوان (اختياري)</label>
              </div>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل عنوانك للتوصيل"
                rows={3}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'حفظ البيانات'
            )}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default Register;
