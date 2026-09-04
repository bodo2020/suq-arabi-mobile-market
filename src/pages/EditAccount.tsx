import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, User, Phone, Mail, Lock, ChevronLeft } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const EditAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUserData = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!mounted) return;

      if (authError || !authData.user) {
        navigate('/phone-login', { replace: true });
        return;
      }

      const authUser = authData.user;
      setUserId(authUser.id);
      setPhone(authUser.phone || '');
      setEmail(authUser.email || '');

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('name, phone, email')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (customerError) {
        console.error('Error loading customer profile:', customerError);
      }

      if (customerData) {
        setName(customerData.name || '');
        setPhone(authUser.phone || customerData.phone || '');
        setEmail(authUser.email || customerData.email || '');
      }

      setLoading(false);
    };

    void loadUserData();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !userId) return;

    const cleanName = name.trim();
    if (!cleanName) {
      toast({ title: 'الاسم مطلوب', variant: 'destructive' });
      return;
    }

    if (password) {
      if (password.length < 8) {
        toast({
          title: 'كلمة المرور قصيرة',
          description: 'كلمة المرور يجب أن تكون 8 أحرف أو أكثر.',
          variant: 'destructive',
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: 'كلمتا المرور غير متطابقتين',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { error: customerError } = await supabase
        .from('customers')
        .update({ name: cleanName })
        .eq('user_id', userId);
      if (customerError) throw customerError;

      const { error: authMetadataError } = await supabase.auth.updateUser({
        data: { name: cleanName },
      });
      if (authMetadataError) throw authMetadataError;

      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
      }

      localStorage.setItem('userName', cleanName);
      if (phone) localStorage.setItem('userPhone', phone);
      if (email) localStorage.setItem('userEmail', email);

      toast({
        title: 'تم التحديث بنجاح',
        description: password ? 'تم تحديث البيانات وكلمة المرور.' : 'تم تحديث بياناتك بنجاح.',
      });

      setPassword('');
      setConfirmPassword('');
      navigate('/account');
    } catch (error: any) {
      console.error('Error updating user data:', error);
      toast({
        title: 'تعذر حفظ التعديلات',
        description: error?.message || 'حدث خطأ أثناء تحديث البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-gray-500">جاري تحميل بيانات الحساب...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="py-4 px-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/account')} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تعديل البيانات الشخصية</h1>
          <div className="w-10" />
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <Link to="/addresses" className="text-primary text-sm flex items-center">
              إدارة العناوين
              <ChevronLeft size={16} />
            </Link>
            <h2 className="font-bold">بيانات الحساب</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg p-4 space-y-4">
            <div>
              <div className="flex items-center mb-2">
                <User size={18} className="ml-2 text-gray-500" />
                <label htmlFor="name" className="font-medium">الاسم</label>
              </div>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل اسمك"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Link to="/change-phone" className="text-primary text-sm font-medium">
                  تغيير الرقم بأمان
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
                readOnly
                className="w-full p-3 border border-gray-200 rounded-lg text-left bg-gray-50"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">تغيير رقم الهاتف يحتاج رمز تحقق على الرقم الجديد.</p>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <Mail size={18} className="ml-2 text-gray-500" />
                <label htmlFor="email" className="font-medium">البريد الإلكتروني</label>
              </div>
              <input
                type="email"
                id="email"
                value={email}
                readOnly
                className="w-full p-3 border border-gray-200 rounded-lg text-left bg-gray-50"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">تغيير البريد الإلكتروني هنضيف له مسار تأكيد منفصل لاحقًا.</p>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <Lock size={18} className="ml-2 text-gray-500" />
                <label htmlFor="password" className="font-medium">تغيير كلمة المرور (اختياري)</label>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="8 أحرف أو أكثر"
              />
            </div>

            <div>
              <div className="flex items-center mb-2">
                <Lock size={18} className="ml-2 text-gray-500" />
                <label htmlFor="confirmPassword" className="font-medium">تأكيد كلمة المرور</label>
              </div>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-right"
                placeholder="أدخل كلمة المرور مرة أخرى"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
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
