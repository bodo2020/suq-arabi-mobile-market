
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Grid, User, ArrowRight } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import { useCart } from '@/contexts/useCart';
import { useIsMobile } from '@/hooks/use-mobile';

interface TopNavBarProps {
  searchPlaceholder?: string;
  onSearchFocus?: () => void;
  searchProps?: any;
  hideLogo?: boolean;
  hideSearch?: boolean;
  hideCart?: boolean;
  pageTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({
  searchPlaceholder = "البحث عن منتجات، أقسام...",
  onSearchFocus,
  searchProps = {},
  hideLogo = false,
  hideSearch = false,
  hideCart = false,
  pageTitle,
  showBackButton = false,
  onBack
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const handleSearchFocus = () => {
    if (onSearchFocus) {
      onSearchFocus();
    } else {
      navigate('/search');
    }
  };
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-white relative overflow-hidden shadow-lg">
      <div className="px-4 py-4">
        {/* Top Row with Logo and Search Bar */}
        <div className="flex items-center justify-between mb-3">
          {/* Logo */}
          <div className="flex items-center">
            {showBackButton && onBack && (
              <button onClick={onBack} className="mr-3 p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowRight className="w-6 h-6" />
              </button>
            )}
            {!hideLogo && (
              <div className="flex items-center">
                <img src="/lovable-uploads/d10815b8-8471-477d-a779-2950224513a7.png" alt="الشعار" className="h-10 w-auto" />
                {pageTitle && <h1 className="mr-3 text-lg font-semibold">{pageTitle}</h1>}
              </div>
            )}
            {hideLogo && pageTitle && <h1 className="text-lg font-semibold">{pageTitle}</h1>}
          </div>

          {/* Search Bar - Centered and prominent */}
          {!hideSearch && (
            <div className="flex-1 max-w-sm mx-4">
              <SearchBar 
                placeholder={searchPlaceholder} 
                onFocus={handleSearchFocus} 
                className="bg-white/90 text-gray-900 placeholder-gray-500 border-0 shadow-sm" 
                {...searchProps} 
              />
            </div>
          )}

          {/* Cart/Shopping Icon placeholder */}
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white rounded"></div>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="text-center">
          <div className="flex items-center justify-center text-white/90">
            <div className="mr-2 w-2 h-2 bg-white rounded-full"></div>
            <span className="text-sm">التوصيل إلى الزعفران، منطقة</span>
          </div>
        </div>
      </div>
      
      {/* Enhanced curved bottom border with smooth curves */}
      <div 
        className="absolute -bottom-8 left-0 w-full bg-background" 
        style={{
          height: '50px',
          borderTopLeftRadius: '50% 80%',
          borderTopRightRadius: '50% 80%',
          zIndex: 10,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
        }} 
      />
    </div>
  );
};

export default TopNavBar;
