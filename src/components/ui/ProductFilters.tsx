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
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onCompanyChange('all')}
            className={`min-h-10 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-colors ${selectedCompany === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            جميع الشركات
          </button>
          {companies.map(company => (
            <button
              type="button"
              key={company.id}
              onClick={() => onCompanyChange(company.id)}
              className={`min-h-10 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-colors ${selectedCompany === company.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {company.name}
            </button>
          ))}
        </div>
      )}

      {sortOptions.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-2.5">
          <div className="flex items-center gap-2 px-1 text-sm font-semibold text-gray-600">
            <SlidersHorizontal size={17} className="text-primary" />
            ترتيب المنتجات
          </div>
          <Select value={currentSort} onValueChange={onSortChange}>
            <SelectTrigger className="h-10 w-[190px] rounded-xl border-gray-200 bg-gray-50 text-sm">
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
