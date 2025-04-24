
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CategoryScrollAreaRef {
  scrollToSection: (id: string) => void;
}

interface CategoryScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

const CategoryScrollArea = forwardRef<CategoryScrollAreaRef, CategoryScrollAreaProps>(
  ({ children, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      scrollToSection: (id: string) => {
        const element = document.getElementById(id);
        if (element && containerRef.current) {
          const container = containerRef.current;
          const scrollTop = element.offsetTop - container.offsetTop - 80; // 80px offset for the header
          
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }
    }));

    return (
      <ScrollArea className={`h-[calc(100vh-170px)] ${className}`}>
        <div ref={containerRef} className="pr-4">
          {children}
        </div>
      </ScrollArea>
    );
  }
);

CategoryScrollArea.displayName = 'CategoryScrollArea';

export default CategoryScrollArea;
