import BrandLoader from '@/components/ui/BrandLoader';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { getUserReturnRequests, ReturnRequest } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';
import ReturnRequestDetails from '@/components/ui/ReturnRequestDetails';
import { Button } from '@/components/ui/button';
import { useLocation } from '@/hooks/useLocation';
import { useToast } from '@/hooks/use-toast';
import AddressDisplay from '@/components/ui/AddressDisplay';

const ReturnRequests = () => {
  const navigate = useNavigate();
  const { user, session } = useUser();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { toast } = useToast();
  
  // Get stored location data
  const savedAreaName = localStorage.getItem('userArea');
  const savedNeighborhoodName = localStorage.getItem('userNeighborhood');

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

  const handleLocationSuccess = () => {
    toast({
      title: "تم تحديد موقعك",
      description: "تم حفظ إحداثيات موقعك بنجاح"
    });
  };

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

        {/* Location Information */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <AddressDisplay 
            address={localStorage.getItem('userAddress') || ''}
            areaName={savedAreaName}
            neighborhoodName={savedNeighborhoodName}
            latitude={location.latitude || undefined}
            longitude={location.longitude || undefined}
            onEdit={() => navigate('/address-manager')}
          />

          {!location.latitude && !location.longitude && (
            <div className="mt-3">
              <Button 
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        localStorage.setItem('userLatitude', position.coords.latitude.toString());
                        localStorage.setItem('userLongitude', position.coords.longitude.toString());
                        handleLocationSuccess();
                      },
                      (error) => {
                        console.error('Error getting location:', error);
                        toast({
                          variant: "destructive",
                          title: "خطأ",
                          description: "لم نتمكن من تحديد موقعك، يرجى السماح بالوصول إلى الموقع"
                        });
                      }
                    );
                  } else {
                    toast({
                      variant: "destructive",
                      title: "خطأ",
                      description: "متصفحك لا يدعم خدمة تحديد الموقع"
                    });
                  }
                }}
                variant="outline"
                className="w-full flex items-center justify-center"
              >
                <MapPin className="h-4 w-4 ml-2" />
                تحديد موقعي الحالي
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <BrandLoader size="md" className="" />
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

