
import React, { useState, useEffect } from 'react';
import { Barcode, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  placeholder?: string;
  backgroundImage?: string;
  initialQuery?: string;
  onBarcodeClick?: () => void;
  onFocus?: () => void;
  readOnly?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "البحث عن منتجات...",
  backgroundImage,
  initialQuery = '',
  onBarcodeClick,
  onFocus,
  readOnly = false
}) => {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleBarcodeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onBarcodeClick) {
      onBarcodeClick();
    } else {
      navigate('/barcode-scanner');
    }
  };

  const handleFocus = () => {
    if (onFocus) {
      onFocus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!readOnly) {
      setQuery(e.target.value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center overflow-hidden rounded-2xl border border-[#c8e0d2] bg-white transition-[border-color,box-shadow] focus-within:border-[#005931] focus-within:shadow-[0_0_0_3px_#fff5d3]">
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search size={20} className="absolute right-3 text-[#005931]" />
          <input
            type="search"
            aria-label="البحث عن المنتجات"
            enterKeyHint="search"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`min-w-0 w-full bg-transparent py-3 pl-2 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-500 ${
              readOnly ? 'cursor-pointer' : ''
            }`}
          />
        </div>
        <button
          type="button"
          onClick={handleBarcodeClick}
          aria-label="مسح باركود المنتج"
          title="مسح باركود المنتج"
          className="group flex h-11 w-12 shrink-0 items-center justify-center border-r border-[#c8e0d2] bg-[#fff5d3] transition-colors hover:bg-[#FFC120] active:bg-[#FFC120]"
        >
          <Barcode size={23} strokeWidth={2.2} className="text-[#005931] transition-transform group-active:scale-95" />
        </button>
      </div>
    </form>
  );
};

export default SearchBar;

