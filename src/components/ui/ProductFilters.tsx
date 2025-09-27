
import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  selectedCompany = "all", 
  onCompanyChange 
}: ProductFiltersProps) => {
  // إضافة معالج للنقر لإيقاف انتشار الحدث
  const handleSortClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleChipClick = (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCompanyChange) {
      onCompanyChange(companyId);
    }
  };

  return (
    <div className="space-y-3 mb-4 px-4">
      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <Select value={currentSort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[200px]" onClick={handleSortClick}>
            <SelectValue placeholder="ترتيب حسب" />
          </SelectTrigger>
          <SelectContent onClick={handleSortClick} className="bg-white z-50">
            <SelectGroup>
              {sortOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value} 
                  onClick={(e) => e.stopPropagation()}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Company Chips */}
      {companies.length > 0 && onCompanyChange && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700">الشركات:</span>
          <div className="flex flex-wrap gap-2">
            {/* All Companies Chip */}
            <button
              onClick={(e) => handleChipClick("all", e)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCompany === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              جميع الشركات
            </button>
            
            {/* Individual Company Chips */}
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={(e) => handleChipClick(company.id, e)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCompany === company.id
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {company.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
