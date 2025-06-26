
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import GoogleMap from '@/components/ui/GoogleMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';

const MapPage = () => {
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  const handleLocationUpdate = (lat: number, lng: number) => {
    setCurrentLocation({ lat, lng });
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Navigation className="h-6 w-6" />
            الخريطة والموقع
          </h1>
          <p className="text-gray-600">
            اضغط على "تحديد موقعي" للسماح بالوصول إلى موقعك الحالي
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  خريطة تفاعلية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GoogleMap 
                  height="500px"
                  zoom={15}
                  onLocationUpdate={handleLocationUpdate}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات الموقع</CardTitle>
              </CardHeader>
              <CardContent>
                {currentLocation ? (
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold">خط العرض:</span>
                      <p className="text-sm text-gray-600">{currentLocation.lat.toFixed(6)}</p>
                    </div>
                    <div>
                      <span className="font-semibold">خط الطول:</span>
                      <p className="text-sm text-gray-600">{currentLocation.lng.toFixed(6)}</p>
                    </div>
                    <div className="pt-2">
                      <p className="text-xs text-green-600">
                        ✓ تم تحديد موقعك بنجاح
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      لم يتم تحديد الموقع بعد
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      اضغط على "تحديد موقعي" في الخريطة
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">إرشادات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• اضغط على زر "تحديد موقعي" للحصول على موقعك الحالي</p>
                <p>• سيطلب المتصفح إذنك للوصول إلى الموقع</p>
                <p>• يمكنك التكبير والتصغير في الخريطة</p>
                <p>• يتم حفظ موقعك محلياً للاستخدام المستقبلي</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MapPage;
