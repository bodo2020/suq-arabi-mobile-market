import React, { useEffect, useState } from 'react';
import { Barcode, Search, X } from 'lucide-react';
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
  placeholder = 'ابحث عن منتج أو قسم...',
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

    const normalizedQuery = query.trim();
    if (normalizedQuery) {
      navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`);
    }
  };

  const handleBarcodeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (onBarcodeClick) {
      onBarcodeClick();
      return;
    }

    navigate('/barcode-scanner');
  };

  const handleFocus = () => {
    onFocus?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!readOnly) {
      setQuery(e.target.value);
    }
  };

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setQuery('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full"
      role="search"
      dir="rtl"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      <div className="flex w-full items-center gap-2 sm:gap-2.5">
        <div className="group relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-11 items-center justify-center text-primary/75 transition-colors duration-200 group-focus-within:text-primary">
            <Search size={19} strokeWidth={2.2} aria-hidden="true" />
          </div>

          <input
            type="search"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            readOnly={readOnly}
            autoComplete="off"
            enterKeyHint="search"
            aria-label="البحث عن المنتجات"
            className={`h-12 w-full rounded-2xl border border-white/80 bg-white pr-11 text-right text-sm font-medium text-slate-800 shadow-[0_5px_18px_rgba(0,0,0,0.08)] outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 hover:border-white focus:border-white focus:shadow-[0_7px_22px_rgba(0,0,0,0.13)] focus:ring-2 focus:ring-white/35 sm:text-[15px] ${
              query && !readOnly ? 'pl-10' : 'pl-4'
            } ${readOnly ? 'cursor-pointer select-none' : ''}`}
          />

          {query && !readOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 left-1.5 my-auto flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-90"
              aria-label="مسح البحث"
              title="مسح البحث"
            >
              <X size={17} strokeWidth={2.2} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleBarcodeClick}
          className="group/scan flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white text-primary shadow-[0_5px_18px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,0.13)] active:translate-y-0 active:scale-95 md:w-auto md:px-4"
          aria-label="قراءة الباركود"
          title="قراءة الباركود"
        >
          <Barcode
            size={22}
            strokeWidth={2.15}
            className="transition-transform duration-200 group-hover/scan:scale-105"
            aria-hidden="true"
          />
          <span className="hidden whitespace-nowrap text-sm font-bold md:inline">مسح الباركود</span>
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
