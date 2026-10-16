import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type SortOption = {
  label: string;
  value: string;
};

interface Company {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  onSortChange: (value: string) => void;
  sortOptions: SortOption[];
  currentSort: string;
  companies?: Company[];
  selectedCompany?: string;
  onCompanyChange?: (value: string) => void;
}

const ProductFilters = ({
  onSortChange,
  sortOptions,
  currentSort,
  companies = [],
  selectedCompany = 'all',
  onCompanyChange,
}: ProductFiltersProps) => {
  return (
    <div className="mb-4 space-y-3 px-0">
      {companies.length > 0 && onCompanyChange && (
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" dir="rtl" aria-label="فلترة حسب الشركة">
          <button
            type="button"
            onClick={() => onCompanyChange('all')}
            aria-pressed={selectedCompany === 'all'}
            className={`min-h-10 whitespace-nowrap rounded-full border px-4 text-xs font-bold transition-colors ${selectedCompany === 'all' ? 'border-[#005931] bg-[#005931] text-white' : 'border-[#c8e0d2] bg-white text-[#005931] hover:bg-[#fff5d3]'}`}
          >
            جميع الشركات
          </button>
          {companies.map(company => (
            <button
              type="button"
              key={company.id}
              onClick={() => onCompanyChange(company.id)}
              aria-pressed={selectedCompany === company.id}
              className={`min-h-10 whitespace-nowrap rounded-full border px-4 text-xs font-bold transition-colors ${selectedCompany === company.id ? 'border-[#005931] bg-[#005931] text-white' : 'border-[#c8e0d2] bg-white text-[#005931] hover:bg-[#fff5d3]'}`}
            >
              {company.name}
            </button>
          ))}
        </div>
      )}

      {sortOptions.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#d8ebdf] bg-white p-2.5">
          <div className="flex items-center gap-2 px-1 text-sm font-bold text-[#005931]">
            <SlidersHorizontal size={17} className="text-primary" />
            ترتيب المنتجات
          </div>
          <Select value={currentSort} onValueChange={onSortChange}>
            <SelectTrigger className="h-10 w-[min(48vw,190px)] rounded-xl border-[#c8e0d2] bg-[#fff5d3] text-sm text-[#005931]">
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
