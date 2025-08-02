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
  return <div className="bg-primary text-white shadow-lg" style={{
    margin: 0,
    padding: 0
  }}>
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-4">
          {/* Logo and Back Button */}
          <div className="flex items-center">
            {showBackButton && onBack && <button onClick={onBack} className="mr-3 p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowRight className="w-6 h-6" />
              </button>}
            {!hideLogo && <div className="flex items-center">
                <img src="/lovable-uploads/d10815b8-8471-477d-a779-2950224513a7.png" alt="الشعار" className="h-8 w-auto" />
                {pageTitle && <h1 className="mr-3 text-lg font-semibold">{pageTitle}</h1>}
              </div>}
            {hideLogo && pageTitle && <h1 className="text-lg font-semibold">{pageTitle}</h1>}
          </div>

          {/* Search Bar */}
          {!hideSearch && <div className="flex-1 max-w-md mx-4">
              <SearchBar placeholder={searchPlaceholder} onFocus={handleSearchFocus} className="bg-white/20 text-white placeholder-white/70 border-white/30" {...searchProps} />
            </div>}

          {/* Empty space for layout balance */}
          <div className="flex items-center">
            <div className="w-8"></div>
          </div>
        </div>

        {/* Location/Title Section */}
        <div className="text-center pb-2">
          
        </div>
      </div>
      
    </div>;
};
export default TopNavBar;