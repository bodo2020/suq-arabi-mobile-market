
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

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100 relative hover:shadow-md transition-shadow ${backgroundImage ? 'bg-cover bg-center' : ''}`}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
    >
      <Search className="w-5 h-5 text-primary" />
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        readOnly={readOnly}
        onClick={readOnly && onFocus ? onFocus : undefined}
        onFocus={readOnly && onFocus ? onFocus : undefined}
        onChange={(e) => !readOnly && setQuery(e.target.value)}
        className={`flex-1 outline-none text-right text-sm placeholder:text-gray-400 bg-transparent cursor-pointer ${readOnly ? 'bg-transparent' : ''}`}
        style={readOnly ? {pointerEvents: 'auto'} : {}}
      />
      <button
        type="button"
        onClick={handleBarcodeClick}
        className="p-2 hover:bg-primary/10 rounded-full transition-colors group"
        aria-label="مسح الباركود"
      >
        <Barcode className="w-5 h-5 text-primary group-hover:text-primary/80" />
      </button>
    </form>
  );
};

export default SearchBar;
