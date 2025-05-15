
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { getUserReturnRequests, ReturnRequest } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';
import ReturnRequestDetails from '@/components/ui/ReturnRequestDetails';
import { Button } from '@/components/ui/button';

const ReturnRequests = () => {
  const navigate = useNavigate();
  const { user, session } = useUser();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      navigate('/phone-login');
      return;
    }

    const fetchReturnRequests = async () => {
      try {
        if (user) {
          const data = await getUserReturnRequests(user.id);
          setRequests(data);
        }
      } catch (error) {
        console.error('Error fetching return requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReturnRequests();
  }, [user, session, navigate]);

  return (
    <MainLayout>
      <div className="py-4 px-4 max-w-lg mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2" aria-label="الرجوع">
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold flex-1 text-center">طلبات الإرجاع</h1>
          <div className="w-10"></div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-bold mb-2">لا توجد طلبات إرجاع</h2>
            <p className="text-gray-500 mb-8">
              لم تقم بإنشاء أي طلبات إرجاع بعد
            </p>
            <Button onClick={() => navigate('/orders')}>
              العودة إلى الطلبات
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map(request => (
              <ReturnRequestDetails key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ReturnRequests;
