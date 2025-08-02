
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
      navigate(`/search?q=${encodeURIComponent(query)}`);
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
      <div className="relative flex items-center bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center flex-1 relative">
          <Search size={18} className="absolute left-3 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`w-full pl-10 pr-12 py-3 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm ${
              readOnly ? 'cursor-pointer' : ''
            }`}
          />
        </div>
        <button
          type="button"
          onClick={handleBarcodeClick}
          className="p-3 hover:bg-gray-50 transition-colors"
        >
          <QrCode size={18} className="text-gray-600" />
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
