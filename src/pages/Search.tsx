
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Barcode, Search as SearchIcon } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/ui/SearchBar';
import ProductCard from '@/components/ui/ProductCard';
import { searchProducts } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load recent searches from localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  // Save search query to recent searches
  useEffect(() => {
    if (query && query.trim() !== '') {
      const updatedSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    }
  }, [query]);

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
    navigate(-1);
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
      const scanner = new Html5Qrcode("barcode-reader");
      
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
            setShowScanner(false);
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
        setShowScanner(false);
      });
    }, 100);
  };

  const stopBarcodeScanner = () => {
    const scanner = Html5Qrcode.instance("barcode-reader");
    if (scanner) {
      scanner.stop().then(() => {
        setShowScanner(false);
      });
    } else {
      setShowScanner(false);
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
          <h1 className="text-xl font-bold flex-1 text-center">البحث</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <SearchBar 
            initialQuery={query} 
            onBarcodeClick={startBarcodeScanner}
          />
        </div>

        {/* Barcode Scanner */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center p-4">
            <div id="barcode-reader" className="w-full max-w-md h-64 bg-gray-200 rounded-lg overflow-hidden"></div>
            <p className="text-white my-4 text-center">قم بتوجيه الكاميرا نحو الباركود</p>
            <button 
              onClick={stopBarcodeScanner}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg"
            >
              إلغاء
            </button>
          </div>
        )}

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold">عمليات البحث الأخيرة</h2>
              <button 
                onClick={handleClearHistory}
                className="text-sm text-primary"
              >
                مسح
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button 
                  key={index}
                  onClick={() => handleSearchClick(search)}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center"
                >
                  <SearchIcon size={14} className="ml-1" />
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {query && (
          <>
            <h2 className="text-lg font-bold mb-3">نتائج البحث عن "{query}"</h2>
            
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchIcon size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-1">لا توجد نتائج</h3>
                <p className="text-sm text-gray-400">لم نتمكن من العثور على منتجات تطابق "{query}"</p>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Search;
