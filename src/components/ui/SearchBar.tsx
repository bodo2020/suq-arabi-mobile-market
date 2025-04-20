
import React, { useState, useEffect } from 'react';
import { Search, Barcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { processImageBackground } from '@/utils/imageUtils';

interface SearchBarProps {
  placeholder?: string;
  backgroundImage?: string;
  initialQuery?: string;
  onBarcodeClick?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  placeholder = "البحث عن منتجات...", 
  backgroundImage,
  initialQuery = '',
  onBarcodeClick
}) => {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();
  
  // Update query when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleBarcodeClick = () => {
    if (onBarcodeClick) {
      onBarcodeClick();
    } else {
      // Default behavior if no custom handler is provided
      navigate('/barcode-scan');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 relative ${backgroundImage ? 'bg-cover bg-center' : ''}`}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
    >
      <Search className="w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 outline-none text-right text-sm placeholder:text-gray-400"
      />
      <button 
        type="button" 
        onClick={handleBarcodeClick}
        className="p-2 hover:bg-gray-50 rounded-full transition-colors"
        aria-label="البحث بالباركود"
      >
        <Barcode className="w-5 h-5 text-gray-400" />
      </button>
    </form>
  );
};

export default SearchBar;
