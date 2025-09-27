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
  return <div className="fixed top-0 left-0 right-0 bg-primary text-white shadow-lg rounded-b-3xl z-50">
      <div className="px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          {showBackButton}

          {/* Logo */}
          {!hideLogo && <img src="/lovable-uploads/d10815b8-8471-477d-a779-2950224513a7.png" alt="الشعار" className="h-10 w-auto" />}

          {/* Page Title in center when logo and search are hidden */}
          {pageTitle && hideLogo && hideSearch && <div className="flex-1 text-center">
              <h1 className="text-xl font-bold">{pageTitle}</h1>
            </div>}

          {/* Search Bar */}
          {!hideSearch && <div className="flex-1 max-w-2xl">
              <SearchBar placeholder={searchPlaceholder} onFocus={handleSearchFocus} {...searchProps} />
            </div>}
        </div>
      </div>
    </div>;
};
export default TopNavBar;