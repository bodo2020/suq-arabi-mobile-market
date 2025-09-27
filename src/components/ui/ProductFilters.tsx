
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

  const handleCompanyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="flex items-center gap-2 mb-4 px-4 flex-wrap">
      <Select value={currentSort} onValueChange={onSortChange}>
        <SelectTrigger className="w-[200px]" onClick={handleSortClick}>
          <SelectValue placeholder="ترتيب حسب" />
        </SelectTrigger>
        <SelectContent onClick={handleSortClick}>
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

      {companies.length > 0 && onCompanyChange && (
        <Select value={selectedCompany} onValueChange={onCompanyChange}>
          <SelectTrigger className="w-[180px]" onClick={handleCompanyClick}>
            <SelectValue placeholder="جميع الشركات" />
          </SelectTrigger>
          <SelectContent onClick={handleCompanyClick}>
            <SelectGroup>
              <SelectItem 
                value="all" 
                onClick={(e) => e.stopPropagation()}
              >
                جميع الشركات
              </SelectItem>
              {companies.map((company) => (
                <SelectItem 
                  key={company.id} 
                  value={company.id} 
                  onClick={(e) => e.stopPropagation()}
                >
                  {company.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default ProductFilters;
