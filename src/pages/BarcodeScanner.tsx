import BrandLoader from '@/components/ui/BrandLoader';

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Scan, RefreshCw } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { searchProductByBarcode } from '@/lib/supabase';

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
          async (decodedText) => {
            // Success callback
            console.log("Barcode detected:", decodedText);
            await handleBarcodeDetected(qrScanner, decodedText);
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

  const handleBarcodeDetected = async (scannerInstance: Html5Qrcode, barcode: string) => {
    try {
      // Search for product by barcode
      const product = await searchProductByBarcode(barcode);
      
      // Stop scanner first
      if (scannerInstance.isScanning) {
        await scannerInstance.stop();
      }
      setScanner(null);
      setScanning(false);

      if (product) {
        // Product found - navigate to product page
        toast({
          title: "تم العثور على المنتج",
          description: product.name,
        });
        navigate(`/product/${product.id}`);
      } else {
        // Product not found - show error and go back
        toast({
          title: "المنتج غير موجود",
          description: "لم نتمكن من العثور على منتج بهذا الباركود",
          variant: "destructive",
        });
        navigate(-1);
      }
    } catch (error) {
      console.error("Error processing barcode:", error);
      // Stop scanner on error
      if (scannerInstance.isScanning) {
        try {
          await scannerInstance.stop();
        } catch (stopError) {
          console.error("Error stopping scanner:", stopError);
        }
      }
      setScanner(null);
      setScanning(false);
      
      toast({
        title: "خطأ في البحث",
        description: "حدث خطأ أثناء البحث عن المنتج",
        variant: "destructive",
      });
      navigate(-1);
    }
  };

  const handleBack = () => {
    if (scanner) {
      if (scanner.isScanning) {
        scanner.stop().then(() => {
          setScanner(null);
          setScanning(false);
          navigate(-1);
        }).catch(err => {
          console.error("Error stopping scanner:", err);
          setScanner(null);
          setScanning(false);
          navigate(-1);
        });
      } else {
        setScanner(null);
        setScanning(false);
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  return (
    <MainLayout>
      <TopNavBar variant="title" hideSearch pageTitle="ماسح الباركود" showBackButton onBack={handleBack} />
      <div className="py-4">

        <div className="flex flex-col items-center px-4">
          <Card className="w-full max-w-md shadow-lg border-2 border-primary/10">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Scan size={32} className="text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">امسح الباركود</h2>
                <p className="text-sm text-gray-600">
                  قم بتوجيه الكاميرا نحو الباركود للبحث عن المنتج
                </p>
              </div>

              <div 
                id="barcode-reader" 
                className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-primary/20"
              ></div>
              
              {scanning ? (
                <div className="mt-4 flex items-center justify-center text-primary">
                  <BrandLoader size="sm" className="ml-2" />
                  <span className="text-sm font-medium">جارِ المسح...</span>
                </div>
              ) : (
                <Button
                  onClick={() => window.location.reload()}
                  className="mt-4 w-full bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                >
                  <RefreshCw size={18} className="ml-2" />
                  إعادة المحاولة
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 mb-2">
              تأكد من وضوح الباركود وإضاءة المكان جيداً
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default BarcodeScanner;

