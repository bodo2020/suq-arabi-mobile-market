
import React, { useState, useEffect } from 'react';
import { Search, Barcode } from 'lucide-react';
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
    if (readOnly) return; // don't submit if readOnly
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
      navigate('/barcode-scan');
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
      <div 
        className="relative flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
        style={backgroundImage ? { 
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : undefined}
      >
        <div className="flex items-center flex-1 relative">
          <Search size={20} className="absolute left-3 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`w-full pl-10 pr-12 py-3 bg-transparent border-none outline-none text-gray-700 placeholder-gray-500 ${
              readOnly ? 'cursor-pointer' : ''
            } ${backgroundImage ? 'text-white placeholder-white' : ''}`}
          />
        </div>
        <button
          type="button"
          onClick={handleBarcodeClick}
          className={`p-3 hover:bg-gray-100 transition-colors ${
            backgroundImage ? 'hover:bg-white/20' : ''
          }`}
        >
          <Barcode size={20} className={backgroundImage ? 'text-white' : 'text-gray-600'} />
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
