
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const Address = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load saved address if any
    const savedAddress = localStorage.getItem('userAddress');
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const validate = () => {
    if (!address.trim()) {
      setError('العنوان مطلوب');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // Store in localStorage
    localStorage.setItem('userAddress', address);

    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false);
      navigate(-1);
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
          <h1 className="text-xl font-bold flex-1 text-center">عنوان التوصيل</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <div className="mb-2">
              <label htmlFor="address" className="font-medium block mb-2">العنوان</label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full p-3 border rounded-lg text-right ${error ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="أدخل عنوانك بالتفصيل"
                rows={4}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <p className="text-sm text-gray-500 mb-2">
              يرجى كتابة العنوان بالتفصيل، مثال: المدينة، الحي، الشارع، رقم المبنى، الطابق، رقم الشقة
            </p>

            {/* Future Feature - Map Integration */}
            <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between">
              <span className="text-primary">قريباً</span>
              <div className="flex items-center">
                <span className="text-sm text-gray-700 ml-2">تحديد الموقع على الخريطة</span>
                <div className="bg-gray-200 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
              </div>
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
              <>
                <Check size={18} className="ml-2" />
                حفظ العنوان
              </>
            )}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default Address;
