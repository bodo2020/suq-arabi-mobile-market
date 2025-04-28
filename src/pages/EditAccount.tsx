
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, User, Phone, MapPin, Plus, Lock, ChevronLeft } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import LocationPicker from "@/components/ui/LocationPicker";

interface CustomerData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

const EditAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setName(data.name || '');
          setPhone(data.phone || '');
          setEmail(data.email || user.email || '');
          setCustomerId(data.id);
        } else if (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        navigate('/account/register');
      }
    };

    loadUserData();
  }, [navigate]);

  const handleBack = () => {
    navigate('/account');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!customerId) throw new Error('No customer ID found');

      // Update customer data
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          name,
          phone,
          email: email || null,
        })
        .eq('id', customerId);

      if (customerError) throw customerError;

      // Update password if provided
      if (password && password === confirmPassword && user) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password
        });

        if (passwordError) {
          toast({
            title: "خطأ في تحديث كلمة المرور",
            description: passwordError.message,
            variant: "destructive",
          });
        }
      } else if (password && password !== confirmPassword) {
        toast({
          title: "خطأ",
          description: "كلمة المرور وتأكيدها غير متطابقين",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem('userName', name);
      localStorage.setItem('userPhone', phone);
      localStorage.setItem('userEmail', email);

      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بياناتك بنجاح",
      });

      navigate('/account');
    } catch (error) {
      console.error('Error updating user data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="py-4">
        <div className="flex items-center mb-6">
          <button onClick={handleBack} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تعديل البيانات الشخصية</h1>
          <div className="w-10"></div>
        </div>
        
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <Link to="/account/addresses" className="text-primary text-sm flex items-center">
              إدارة العناوين
              <ChevronLeft size={16} />
            </Link>
            <h2 className="font-bold">بيانات الحساب</h2>
          </div>
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
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل اسمك"
              />
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Link to="/phone-verify" className="text-primary text-sm">
                  التحقق من رقم الهاتف
                </Link>
                <div className="flex items-center">
                  <Phone size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
                </div>
              </div>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل رقم هاتفك"
              />
            </div>
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <MapPin size={18} className="ml-2 text-gray-500" />
                <label htmlFor="email" className="font-medium">البريد الإلكتروني (اختياري)</label>
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل بريدك الإلكتروني"
              />
            </div>
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Lock size={18} className="ml-2 text-gray-500" />
                <label htmlFor="password" className="font-medium">تغيير كلمة المرور (اختياري)</label>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="كلمة المرور الجديدة"
              />
            </div>
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Lock size={18} className="ml-2 text-gray-500" />
                <label htmlFor="confirmPassword" className="font-medium">تأكيد كلمة المرور</label>
              </div>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل كلمة المرور مرة أخرى"
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
              'حفظ التعديلات'
            )}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default EditAccount;
