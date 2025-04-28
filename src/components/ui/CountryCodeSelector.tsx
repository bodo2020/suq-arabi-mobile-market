
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

// A selection of common country codes, starting with Egypt
const countries: Country[] = [
  { name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'السعودية', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'الإمارات', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'الكويت', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'قطر', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'البحرين', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'عمان', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'الأردن', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'لبنان', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'المغرب', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'الجزائر', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'تونس', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'ليبيا', code: 'LY', dialCode: '+218', flag: '🇱🇾' },
  { name: 'العراق', code: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { name: 'سوريا', code: 'SY', dialCode: '+963', flag: '🇸🇾' },
];

interface CountryCodeSelectorProps {
  value: Country;
  onChange: (country: Country) => void;
  className?: string;
}

export const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredCountries = search 
    ? countries.filter(country => 
        country.name.toLowerCase().includes(search.toLowerCase()) || 
        country.dialCode.includes(search) ||
        country.code.toLowerCase().includes(search.toLowerCase())
      )
    : countries;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg ${className}`}
          type="button"
        >
          <div className="flex items-center">
            <span className="mr-2">{value.flag}</span>
            <span>{value.dialCode}</span>
          </div>
          <ChevronDown size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px] max-h-[300px] overflow-y-auto p-2">
        <div className="mb-2 sticky top-0 bg-white z-10">
          <div className="relative">
            <Input
              placeholder="ابحث عن دولة أو رمز دولي"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8"
            />
            <Search size={16} className="absolute left-2 top-3 text-gray-400" />
          </div>
        </div>
        <div className="space-y-1">
          {filteredCountries.map((country) => (
            <button
              key={country.code}
              className={`flex items-center justify-between w-full px-2 py-2 text-sm hover:bg-gray-100 rounded-md ${
                country.code === value.code ? 'bg-gray-100' : ''
              }`}
              onClick={() => {
                onChange(country);
                setIsOpen(false);
                setSearch('');
              }}
            >
              <div className="flex items-center">
                <span className="mr-2">{country.flag}</span>
                <span>{country.name}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500">{country.dialCode}</span>
                {country.code === value.code && (
                  <Check size={16} className="mr-2 text-green-500" />
                )}
              </div>
            </button>
          ))}
          {filteredCountries.length === 0 && (
            <div className="text-center py-2 text-gray-500">
              لا توجد نتائج للبحث
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CountryCodeSelector;
