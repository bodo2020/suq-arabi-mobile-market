
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Grid, ShoppingCart, User } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import { useCart } from '@/contexts/useCart';
import { useIsMobile } from '@/hooks/use-mobile';

interface TopNavBarProps {
  searchPlaceholder?: string;
  onSearchFocus?: () => void;
  searchProps?: any;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ 
  searchPlaceholder = "البحث عن منتجات، أقسام...",
  onSearchFocus,
  searchProps = {}
}) => {
  const navigate = useNavigate();
  const { getTotalItems } = useCart();
  const cartCount = getTotalItems();
  const isMobile = useIsMobile();

  const handleSearchFocus = () => {
    if (onSearchFocus) {
      onSearchFocus();
    } else {
      navigate('/search');
    }
  };

  return (
    <div className={`bg-primary w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] pt-6 pb-6 mb-6 rounded-b-3xl ${!isMobile ? 'fixed top-0 z-50' : ''}`}>
      <div className="w-full px-4">
        <div className="max-w-md mx-auto md:max-w-7xl">
          <div className="flex items-center mb-2 gap-3">
            {/* Desktop Navigation Icons - Left Side */}
            {!isMobile && (
              <div className="flex gap-6">
                <button
                  onClick={() => navigate('/')}
                  className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
                >
                  <Home size={20} />
                  <span className="text-xs mt-1">الرئيسية</span>
                </button>

                <button
                  onClick={() => navigate('/categories')}
                  className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
                >
                  <Grid size={20} />
                  <span className="text-xs mt-1">الأقسام</span>
                </button>

                <button
                  onClick={() => navigate('/cart')}
                  className="flex flex-col items-center text-white/80 hover:text-white transition-colors relative"
                >
                  <ShoppingCart size={20} />
                  <span className="text-xs mt-1">السلة</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-white text-primary text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => navigate('/account')}
                  className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
                >
                  <User size={20} />
                  <span className="text-xs mt-1">الحساب</span>
                </button>
              </div>
            )}
            
            {/* Search Bar - Center */}
            <div className="flex-1">
              <SearchBar 
                placeholder={searchPlaceholder}
                onFocus={handleSearchFocus} 
                readOnly 
                {...searchProps}
              />
            </div>

            {/* Logo - Right Side */}
            <div className="flex flex-col items-center">
              <img 
                src="/lovable-uploads/f2dcd6d9-e684-4c8f-ba39-879321421b5e.png" 
                alt="المعداوي" 
                className="h-16 w-16 mb-1 object-contain" 
                loading="eager" 
              />
              <span className="text-white text-sm font-bold">المعداوي</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavBar;
