
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
  hideLogo?: boolean;
  hideSearch?: boolean;
  pageTitle?: string;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ 
  searchPlaceholder = "البحث عن منتجات، أقسام...",
  onSearchFocus,
  searchProps = {},
  hideLogo = false,
  hideSearch = false,
  pageTitle
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
    <div className={`bg-primary w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] ${!isMobile ? 'fixed top-0 z-50' : ''} ${pageTitle && (hideLogo || hideSearch) ? 'pt-2 pb-8' : 'pt-4 pb-8'}`}>
      <div className="w-full px-4">
        <div className="max-w-md mx-auto md:max-w-7xl">
          {/* Page Title for mobile when logo is hidden or search is hidden */}
          {pageTitle && (hideLogo || hideSearch) && isMobile && (
            <div className="text-center mb-3">
              <h1 className="text-white text-lg font-bold">{pageTitle}</h1>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {/* Logo - Left Side (always show on desktop, conditionally on mobile) */}
            {(!isMobile || !hideLogo) && (
              <div className="flex flex-col items-center">
                <img 
                  src="/lovable-uploads/f2dcd6d9-e684-4c8f-ba39-879321421b5e.png" 
                  alt="المعداوي" 
                  className="h-16 w-16 mb-1 object-contain" 
                  loading="eager" 
                />
                <span className="text-white text-sm font-bold">المعداوي</span>
              </div>
            )}
            
            {/* Search Bar - Center (always show on desktop, conditionally on mobile) */}
            {(!isMobile || !hideSearch) && (
              <div className="flex-1">
                <SearchBar 
                  placeholder={searchPlaceholder}
                  onFocus={handleSearchFocus} 
                  readOnly 
                  {...searchProps}
                />
              </div>
            )}

            {/* Mobile Cart Icon - Right Side (when search is hidden) */}
            {isMobile && hideSearch && (
              <button
                onClick={() => navigate('/cart')}
                className="relative p-2"
              >
                <ShoppingCart size={24} className="text-white" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-primary text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Desktop Navigation Icons - Right Side */}
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
          </div>
        </div>
      </div>
      
      {/* Curved bottom design */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gray-50" style={{
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px'
      }}></div>
    </div>
  );
};

export default TopNavBar;
