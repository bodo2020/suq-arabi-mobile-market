
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import GoogleMap from '@/components/ui/GoogleMap';

const MapApplication = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">تطبيق الخرائط التفاعلي</h1>
            <p className="text-sm text-gray-600 mt-1">اكتشف المواقع واضف النقاط بسهولة</p>
          </div>
          
          <div className="w-16"></div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[calc(100vh-80px)]">
        <GoogleMap height="100%" />
      </div>
    </div>
  );
};

export default MapApplication;
