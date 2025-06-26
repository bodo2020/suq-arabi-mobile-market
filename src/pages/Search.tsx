
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Barcode, Search as SearchIcon, X, Scan } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/ui/SearchBar';
import ProductCard from '@/components/ui/ProductCard';
import { searchProducts, getProducts } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load recent searches from localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  // Fetch popular products when component mounts
  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        const allProducts = await getProducts();
        // Get random products as "popular" products
        const shuffled = allProducts.sort(() => 0.5 - Math.random());
        setPopularProducts(shuffled.slice(0, 8));
      } catch (error) {
        console.error('Error fetching popular products:', error);
      }
    };

    fetchPopularProducts();
  }, []);

  // Save search query to recent searches
  useEffect(() => {
    if (query && query.trim() !== '') {
      const updatedSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    }
  }, [query]);

  // Cleanup effect for scanner when component unmounts or scanner state changes
  useEffect(() => {
    return () => {
      // Clean up scanner on component unmount
      if (scannerRef.current) {
        console.log("Stopping scanner on Search component unmount");
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(err => {
              console.error("Error stopping scanner:", err);
            });
          }
          scannerRef.current = null;
        } catch (err) {
          console.error("Error during scanner cleanup:", err);
        }
      }
    };
  }, []);

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      if (query && query.trim() !== '') {
        setLoading(true);
        try {
          const results = await searchProducts(query);
          setProducts(results);
        } catch (error) {
          console.error('Error searching products:', error);
          toast({
            title: "حدث خطأ",
            description: "لم نتمكن من البحث عن المنتجات",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      } else {
        setProducts([]);
      }
    };

    fetchResults();
  }, [query, toast]);

  const handleBack = () => {
    if (showScanner && scannerRef.current) {
      stopBarcodeScanner();
    } else {
      navigate(-1);
    }
  };

  const handleSearchClick = (search: string) => {
    navigate(`/search?q=${encodeURIComponent(search)}`);
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const startBarcodeScanner = () => {
    setShowScanner(true);
    
    // Wait for the DOM to update with the scanner element
    setTimeout(() => {
      try {
        const qrScanner = new Html5Qrcode("barcode-reader");
        scannerRef.current = qrScanner;
        
        qrScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
          },
          (decodedText) => {
            // Success callback
            console.log("Barcode detected:", decodedText);
            
            // Check if scanner is still active
            if (scannerRef.current && scannerRef.current.isScanning) {
              scannerRef.current.stop().then(() => {
                setShowScanner(false);
                scannerRef.current = null;
                navigate(`/search?q=${encodeURIComponent(decodedText)}`);
              }).catch(err => {
                console.error("Error stopping scanner:", err);
                // Still navigate even if there was an error stopping
                setShowScanner(false);
                scannerRef.current = null;
                navigate(`/search?q=${encodeURIComponent(decodedText)}`);
              });
            } else {
              // Scanner might have been stopped by another process
              setShowScanner(false);
              navigate(`/search?q=${encodeURIComponent(decodedText)}`);
            }
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
          setShowScanner(false);
        });
      } catch (err) {
        console.error("Error creating scanner instance:", err);
        toast({
          title: "فشل تشغيل الماسح",
          description: "حدث خطأ أثناء تهيئة الماسح",
          variant: "destructive",
        });
        setShowScanner(false);
      }
    }, 100);
  };

  const stopBarcodeScanner = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            setShowScanner(false);
            scannerRef.current = null;
          }).catch(err => {
            console.error("Error stopping scanner:", err);
            setShowScanner(false);
            scannerRef.current = null;
          });
        } else {
          // Scanner is not running, just update state
          setShowScanner(false);
          scannerRef.current = null;
        }
      } catch (err) {
        console.error("Error during scanner cleanup:", err);
        setShowScanner(false);
        scannerRef.current = null;
      }
    } else {
      setShowScanner(false);
    }
  };

  return (
    <MainLayout>
      <div className="py-0">
        {/* Header Section with Primary Color Background - Full Screen Width */}
        <div className="bg-primary w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] pt-6 pb-6 mb-6 rounded-b-3xl">
          <div className="max-w-md mx-auto px-4 md:max-w-4xl">
            <div className="flex items-center mb-2 gap-3">
              <div className="flex flex-col items-center">
                <img 
                  src="/lovable-uploads/f2dcd6d9-e684-4c8f-ba39-879321421b5e.png" 
                  alt="المعداوي" 
                  className="h-16 w-16 mb-1 object-contain" 
                  loading="eager" 
                />
                <span className="text-white text-sm font-bold">المعداوي</span>
              </div>
              
              <div className="flex-1">
                <SearchBar 
                  initialQuery={query} 
                  onBarcodeClick={startBarcodeScanner}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 md:max-w-4xl">
          {/* Header with back button */}
          <div className="flex items-center mb-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="الرجوع"
            >
              <ArrowRight size={24} className="text-primary" />
            </button>
            <h1 className="text-xl font-bold flex-1 text-center text-primary">البحث</h1>
            <div className="w-10"></div>
          </div>

          {/* Modern Barcode Scanner Overlay */}
          {showScanner && (
            <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
              <Card className="w-full max-w-md shadow-2xl border-2 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-primary">ماسح الباركود</h3>
                    <button 
                      onClick={stopBarcodeScanner}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X size={20} className="text-gray-500" />
                    </button>
                  </div>
                  
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Scan size={24} className="text-primary" />
                    </div>
                    <p className="text-sm text-gray-600">
                      قم بتوجيه الكاميرا نحو الباركود
                    </p>
                  </div>

                  <div 
                    id="barcode-reader" 
                    className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-primary/30"
                  ></div>
                  
                  <Button 
                    onClick={stopBarcodeScanner}
                    variant="outline"
                    className="w-full mt-4 border-primary text-primary hover:bg-primary hover:text-white"
                  >
                    إلغاء
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-primary">عمليات البحث الأخيرة</h2>
                <button 
                  onClick={handleClearHistory}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  مسح
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button 
                    key={index}
                    onClick={() => handleSearchClick(search)}
                    className="bg-primary/10 text-primary px-3 py-2 rounded-full text-sm flex items-center hover:bg-primary/20 transition-colors"
                  >
                    <SearchIcon size={14} className="ml-1" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Products - Show when no search query */}
          {!query && popularProducts.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3 text-primary">منتجات مميزة</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {popularProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <>
              <h2 className="text-lg font-bold mb-3 text-primary">نتائج البحث عن "{query}"</h2>
              
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <SearchIcon size={48} className="text-primary/30 mb-4" />
                  <h3 className="text-lg font-medium text-primary mb-1">لا توجد نتائج</h3>
                  <p className="text-sm text-gray-400">لم نتمكن من العثور على منتجات تطابق "{query}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Search;
