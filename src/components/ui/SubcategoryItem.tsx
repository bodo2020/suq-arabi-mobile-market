import React from 'react';
import { Subcategory } from '@/lib/supabase';

interface SubcategoryItemProps {
  subcategory: Subcategory;
  isSelected: boolean;
  onClick: (subcategoryId: string) => void;
}

const SubcategoryItem = ({
  subcategory,
  isSelected,
  onClick
}: SubcategoryItemProps) => {
  const handleClick = () => {
    onClick(subcategory.id);
  };

  return (
    <button 
      onClick={handleClick}
      className={`flex flex-col items-center justify-center rounded-lg p-1 transition-all duration-200 w-full ${
        isSelected 
          ? 'bg-primary/20 ring-2 ring-primary' 
          : 'hover:bg-gray-100'
      }`}
    >
      <div className={`w-full aspect-square flex items-center justify-center overflow-hidden rounded-lg ${
        isSelected ? 'bg-primary/20' : 'bg-primary/10'
      }`}>
        {subcategory.image_url ? (
          <img 
            src={subcategory.image_url} 
            alt={subcategory.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <span className="text-2xl text-primary font-semibold">
            {subcategory.name.charAt(0)}
          </span>
        )}
      </div>
      
      <span className={`text-sm text-center mt-1 transition-colors ${
        isSelected ? 'text-primary font-medium' : 'text-foreground'
      }`}>
        {subcategory.name}
      </span>
    </button>
  );
};

export default SubcategoryItem;