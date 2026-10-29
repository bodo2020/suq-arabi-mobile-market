import React, { useEffect, useRef, useState } from 'react';
import { Barcode, Search, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface SearchBarProps {
  placeholder?: string;
  backgroundImage?: string;
  initialQuery?: string;
  onBarcodeClick?: () => void;
  onFocus?: () => void;
  readOnly?: boolean;
  appearance?: 'default' | 'category' | 'hero';
  animatedSuggestions?: boolean;
  showBarcode?: boolean;
}

const homeSuggestions = [
  'دور على اللبن والجبنة',
  'عايز رز وسكر؟',
  'محتاج منظفات للبيت؟',
  'جرّب تبحث عن القهوة والشاي',
  'إيه رأيك في سناكس وحلويات؟',
  'دور على مستلزمات الطبخ',
] as const;

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'البحث عن منتجات...',
  backgroundImage: _backgroundImage,
  initialQuery = '',
  onBarcodeClick,
  onFocus,
  readOnly = false,
  appearance = 'default',
  animatedSuggestions = false,
  showBarcode = true,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [typedSuggestion, setTypedSuggestion] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocusedKey = useRef<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Decorative placeholder only: never write suggested text into the real
  // search input, and never submit a suggestion without the shopper choosing it.
  // One timeout runs at a time and is cancelled when the bar unmounts.
  useEffect(() => {
    if (!animatedSuggestions || !readOnly) {
      setTypedSuggestion('');
      return;
    }
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedSuggestion(homeSuggestions[0]);
      return;
    }

    let phrase = 0;
    let length = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (document.hidden || document.body.dataset.productSheetOpen === 'true') {
        timer = setTimeout(tick, 800);
        return;
      }

      const target = homeSuggestions[phrase];
      length += erasing ? -1 : 1;
      length = Math.min(target.length, Math.max(0, length));
      setTypedSuggestion(target.slice(0, length));

      if (!erasing && length === target.length) {
        erasing = true;
        timer = setTimeout(tick, 1900);
      } else if (erasing && length === 0) {
        erasing = false;
        phrase = (phrase + 1) % homeSuggestions.length;
        timer = setTimeout(tick, 340);
      } else {
        timer = setTimeout(tick, erasing ? 35 : 78);
      }
    };

    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [animatedSuggestions, readOnly]);

  // Focus the real editable search on intentional navigation from a header.
  // Deep links with search results don't unexpectedly pop the keyboard.
  useEffect(() => {
    const request = (location.state as { focusSearch?: boolean } | null)?.focusSearch;
    const key = location.key;
    if (readOnly || !request || lastFocusedKey.current === key || location.pathname !== '/search') return;
    lastFocusedKey.current = key;
    inputRef.current?.focus({ preventScroll: true });
  }, [location.key, location.pathname, location.state, readOnly]);

  const clearSearch = () => {
    setQuery('');
    if (location.pathname === '/search' && location.search) navigate('/search', { replace: true });
    inputRef.current?.focus({ preventScroll: true });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    const value = query.trim();
    if (value) navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  const handleBarcodeClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onBarcodeClick) onBarcodeClick();
    else navigate('/barcode-scanner');
  };

  const hero = appearance === 'hero';
  const category = appearance === 'category';
  const showTyping = animatedSuggestions && readOnly && !query;

  return (
    <form onSubmit={handleSubmit} className="relative w-full" role="search">
      <div className={`relative flex items-center overflow-hidden border transition-colors focus-within:border-[#005931] ${
        hero
          ? 'h-[54px] rounded-full border-[#b8d8c8] bg-white shadow-[0_4px_18px_rgba(0,89,49,.07)] sm:h-[58px]'
          : category
            ? 'rounded-full border-emerald-200 bg-white shadow-[0_2px_8px_rgba(0,89,49,.02)]'
            : 'rounded-xl border-emerald-100 bg-white focus-within:bg-white'
      }`}>
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search
            size={hero ? 22 : 20}
            className={`pointer-events-none absolute z-10 ${
              hero || category ? 'right-4 text-[#005931]' : 'right-3 text-gray-400'
            }`}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            aria-label="البحث عن المنتجات"
            enterKeyHint="search"
            value={query}
            onChange={event => { if (!readOnly) setQuery(event.target.value); }}
            onFocus={readOnly ? undefined : onFocus}
            onClick={readOnly ? onFocus : undefined}
            onKeyDown={event => {
              if (readOnly && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                onFocus?.();
              }
            }}
            placeholder={showTyping ? '' : placeholder}
            readOnly={readOnly}
            className={`min-w-0 w-full bg-transparent pl-3 text-gray-900 outline-none placeholder:text-gray-500 ${
              hero ? 'py-4 pr-12 text-base' : 'py-3 pr-10 text-sm'
            } ${readOnly ? 'cursor-pointer' : ''}`}
          />
          {showTyping && (
            <span
              aria-hidden="true"
              dir="rtl"
              className="pointer-events-none absolute inset-y-0 left-3 right-12 flex items-center overflow-hidden whitespace-nowrap text-sm font-medium text-slate-500 sm:text-base"
            >
              <span className="min-w-0 truncate">{typedSuggestion || placeholder}</span>
              <span className="mr-1 inline-block h-[18px] w-[2px] shrink-0 animate-pulse rounded-full bg-[#005931] motion-reduce:animate-none" />
            </span>
          )}
        </div>
        {!readOnly && query && (
          <button
            type="button"
            aria-label="مسح نص البحث"
            onClick={clearSearch}
            className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-emerald-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
        {showBarcode && (
          <button
            type="button"
            onClick={handleBarcodeClick}
            aria-label="مسح باركود المنتج"
            title="مسح باركود المنتج"
            className="group flex h-11 w-12 shrink-0 items-center justify-center border-r border-emerald-100 bg-brand-cream text-brand-green transition-colors hover:bg-brand-yellow/25 active:bg-brand-yellow/35"
          >
            <Barcode size={23} strokeWidth={2.2} className="text-[#005931] transition-transform group-active:scale-95" />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
