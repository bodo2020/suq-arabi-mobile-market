
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
  const {
    getTotalItems
  } = useCart();
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
    <div className="bg-primary text-white relative overflow-hidden"
         style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo and Back Button */}
          <div className="flex items-center">
            {showBackButton && onBack && (
              <button 
                onClick={onBack}
                className="mr-3 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            )}
            {!hideLogo && (
              <div className="flex items-center">
                <img 
                  src="/lovable-uploads/d10815b8-8471-477d-a779-2950224513a7.png" 
                  alt="الشعار" 
                  className="h-8 w-auto"
                />
                {pageTitle && (
                  <h1 className="mr-3 text-lg font-semibold">{pageTitle}</h1>
                )}
              </div>
            )}
            {hideLogo && pageTitle && (
              <h1 className="text-lg font-semibold">{pageTitle}</h1>
            )}
          </div>

          {/* Search Bar */}
          {!hideSearch && (
            <div className="flex-1 max-w-md mx-4">
              <SearchBar 
                placeholder={searchPlaceholder}
                onFocus={handleSearchFocus}
                className="bg-white/20 text-white placeholder-white/70 border-white/30"
                {...searchProps}
              />
            </div>
          )}

          {/* Cart and Navigation Icons */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {!hideCart && (
              <button onClick={() => navigate('/cart')} className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="21" r="1"></circle>
                  <circle cx="19" cy="21" r="1"></circle>
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
            
            <button onClick={() => navigate('/favorites')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            
            <button onClick={() => navigate('/account')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Curved bottom border - in the original direction */}
      <div 
        className="absolute bottom-0 left-0 w-full h-6 bg-background"
        style={{
          borderTopLeftRadius: '50% 100%',
          borderTopRightRadius: '50% 100%',
          transform: 'translateY(50%)'
        }}
      />
    </div>
  );
};

export default TopNavBar;
