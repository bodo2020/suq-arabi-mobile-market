
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';

const BarcodeScanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const startScanner = () => {
      const scanner = new Html5Qrcode("barcode-reader");
      setScanning(true);
      
      scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          // Success callback
          console.log("Barcode detected:", decodedText);
          scanner.stop().then(() => {
            navigate(`/search?q=${encodeURIComponent(decodedText)}`);
          });
        },
        (errorMessage) => {
          // Error callback - we'll just log it and continue scanning
          console.log("Error scanning barcode:", errorMessage);
        }
      ).catch((err) => {
        console.error("Failed to start scanner:", err);
        toast({
          title: "فشل تشغيل الماسح",
          description: "تأكد من إعطاء الإذن للوصول إلى الكاميرا",
          variant: "destructive",
        });
        setScanning(false);
      });
    };

    // Start scanner with a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      startScanner();
    }, 1000);

    return () => {
      clearTimeout(timer);
      // Clean up scanner on component unmount
      const scanner = Html5Qrcode.instance("barcode-reader");
      if (scanner) {
        scanner.stop().catch(err => console.error("Error stopping scanner:", err));
      }
    };
  }, [navigate, toast]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <MainLayout>
      <div className="py-4">
        {/* Header with back button */}
        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">ماسح الباركود</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        <div className="flex flex-col items-center">
          <div id="barcode-reader" className="w-full max-w-md h-64 bg-gray-200 rounded-lg"></div>
          
          <p className="mt-4 text-center text-gray-600">
            قم بتوجيه الكاميرا نحو الباركود للبحث عن المنتج
          </p>

          {scanning ? (
            <div className="mt-4 flex items-center text-primary">
              <span className="ml-2">جارِ المسح</span>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg"
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default BarcodeScanner;
