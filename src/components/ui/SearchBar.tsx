
import React, { useState, useEffect } from 'react';
import { Search, QrCode } from 'lucide-react';
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
      <div className="relative flex items-center bg-gray-50 rounded-xl border border-gray-200 focus-within:border-green-600 overflow-hidden">
        <div className="flex min-w-0 items-center flex-1 relative">
          <Search size={20} className="absolute right-3 text-gray-400" />
          <input
            type="search"
            aria-label="البحث عن المنتجات"
            enterKeyHint="search"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`min-w-0 w-full pl-2 pr-10 py-3 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm ${
              readOnly ? 'cursor-pointer' : ''
            }`}
          />
        </div>
        <button
          type="button"
          onClick={handleBarcodeClick}
          aria-label="البحث بالباركود"
          className="flex h-11 w-11 shrink-0 items-center justify-center border-r border-gray-200 hover:bg-green-50 transition-colors"
        >
          <QrCode size={20} className="text-[#005931]" />
        </button>
      </div>
    </form>
  );
};

export default SearchBar;

