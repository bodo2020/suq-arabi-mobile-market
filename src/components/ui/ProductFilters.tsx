
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

interface ProductFiltersProps {
  onSortChange: (value: string) => void;
  sortOptions: SortOption[];
  currentSort: string;
}

const ProductFilters = ({ onSortChange, sortOptions, currentSort }: ProductFiltersProps) => {
  return (
    <div className="flex items-center gap-2 mb-4 px-4">
      <Select value={currentSort} onValueChange={onSortChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="ترتيب حسب" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ProductFilters;
