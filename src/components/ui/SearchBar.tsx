
import React, { useState } from 'react';
import { Search, Barcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ placeholder = "ابحث عن منتجات..." }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleBarcodeClick = () => {
    // For now, we'll show an alert
    alert("سيتم تفعيل الباركود قريباً");
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 relative"
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
