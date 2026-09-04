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
      className="flex flex-col items-center justify-center rounded-lg p-1 transition-colors hover:bg-gray-100 w-full"
    >
      <div className="w-full aspect-square bg-primary/10 flex items-center justify-center overflow-hidden rounded-lg">
        {subcategory.image_url ? (
          <img 
            src={subcategory.image_url} 
            alt={subcategory.name} 
            className="w-full h-full object-cover" 
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="text-2xl">
            {subcategory.name.charAt(0)}
          </span>
        )}
      </div>
      
      <span className="text-sm text-center mt-1">
        {subcategory.name}
      </span>
    </button>
  );
};

export default SubcategoryItem;