
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
      <div className="relative flex items-center bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 overflow-hidden">
        <div className="flex items-center flex-1 relative">
          <Search size={20} className="absolute left-4 text-white/70" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`w-full pl-12 pr-16 py-4 bg-transparent border-none outline-none text-white placeholder-white/70 ${
              readOnly ? 'cursor-pointer' : ''
            }`}
          />
        </div>
        <button
          type="button"
          onClick={handleBarcodeClick}
          className="p-4 hover:bg-white/10 transition-colors rounded-r-2xl"
        >
          <QrCode size={20} className="text-white" />
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
