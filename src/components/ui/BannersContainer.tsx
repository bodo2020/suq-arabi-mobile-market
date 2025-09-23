
import React from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Banner from './Banner';

interface BannersContainerProps {
  banners: {
    id: string;
    title: string;
    image_url: string;
    link?: string;
    category_id?: string;
    products?: string[];
  }[];
}

const BannersContainer: React.FC<BannersContainerProps> = ({ banners }) => {
  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md">
      <div className="flex w-max space-x-4">
        {banners.map((banner) => (
          <Banner key={banner.id} banner={banner} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default BannersContainer;
