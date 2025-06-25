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
  return;
};
export default SearchBar;