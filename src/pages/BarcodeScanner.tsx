
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Scan } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const BarcodeScanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    const startScanner = () => {
      try {
        const qrScanner = new Html5Qrcode("barcode-reader");
        setScanner(qrScanner);
        setScanning(true);
        
        qrScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
          },
          (decodedText) => {
            // Success callback
            console.log("Barcode detected:", decodedText);
            stopScannerAndNavigate(qrScanner, decodedText);
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
      } catch (err) {
        console.error("Error creating scanner instance:", err);
        toast({
          title: "فشل تشغيل الماسح",
          description: "حدث خطأ أثناء تهيئة الماسح",
          variant: "destructive",
        });
        setScanning(false);
      }
    };

    // Start scanner with a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      startScanner();
    }, 1000);

    return () => {
      clearTimeout(timer);
      // Clean up scanner on component unmount
      if (scanner) {
        console.log("Stopping scanner on component unmount");
        // Check if scanner is running before stopping
        if (scanner.isScanning) {
          scanner.stop().then(() => {
            console.log("Scanner stopped successfully");
          }).catch(err => {
            console.error("Error stopping scanner:", err);
          });
        }
        setScanner(null);
      }
    };
  }, [navigate, toast]);

  const stopScannerAndNavigate = (scannerInstance: Html5Qrcode, decodedText?: string) => {
    // Only attempt to stop if it's scanning
    if (scannerInstance.isScanning) {
      scannerInstance.stop().then(() => {
        setScanner(null);
        setScanning(false);
        navigateToDestination(decodedText);
      }).catch(err => {
        console.error("Error stopping scanner:", err);
        // Still navigate even if there was an error stopping
        setScanner(null);
        setScanning(false);
        navigateToDestination(decodedText);
      });
    } else {
      // If not scanning, just navigate
      setScanner(null);
      setScanning(false);
      navigateToDestination(decodedText);
    }
  };

  const navigateToDestination = (decodedText?: string) => {
    if (decodedText) {
      navigate(`/search?q=${encodeURIComponent(decodedText)}`);
    } else {
      navigate(-1);
    }
  };

  const handleBack = () => {
    if (scanner) {
      stopScannerAndNavigate(scanner);
    } else {
      navigate(-1);
    }
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
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              إعادة المحاولة
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default BarcodeScanner;
