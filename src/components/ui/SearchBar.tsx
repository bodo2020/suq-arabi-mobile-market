
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
    // For a real implementation, this would integrate with a barcode scanner
    // For now, we'll show an alert
    alert("سيتم تفعيل الباركود قريباً");
    
    // In a real implementation with Capacitor, you might use the camera:
    // import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
    // async function startScan() {
    //   await BarcodeScanner.checkPermission({ force: true });
    //   BarcodeScanner.hideBackground();
    //   const result = await BarcodeScanner.startScan();
    //   if (result.hasContent) {
    //     navigate(`/search?barcode=${result.content}`);
    //   }
    // }
    // startScan();
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <Search size={20} className="text-gray-400 ml-2" />
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 bg-transparent border-none outline-none text-right"
      />
      <button 
        type="button" 
        onClick={handleBarcodeClick}
        className="p-1"
        aria-label="البحث بالباركود"
      >
        <Barcode size={20} className="text-gray-400" />
      </button>
    </form>
  );
};

export default SearchBar;
