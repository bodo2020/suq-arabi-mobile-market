import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  return <div className="space-y-3 mb-4 px-4">
      {/* Company Chips */}
      {companies.length > 0 && onCompanyChange && <div className="flex gap-2 overflow-x-auto">
          {/* All Companies Chip */}
          <button onClick={e => handleChipClick("all", e)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${selectedCompany === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            جميع الشركات
          </button>
          
          {/* Individual Company Chips */}
          {companies.map(company => <button key={company.id} onClick={e => handleChipClick(company.id, e)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${selectedCompany === company.id ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {company.name}
            </button>)}
        </div>}

      {/* Sort Dropdown */}
      
    </div>;
};
export default ProductFilters;