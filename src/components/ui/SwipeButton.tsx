
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwipeButtonProps {
  onComplete: () => void;
  className?: string;
  completeText?: string;
  loadingText?: string;
  isLoading?: boolean;
}

const SwipeButton = ({ 
  onComplete, 
  className,
  completeText = "تم التأكيد", 
  loadingText = "جاري التنفيذ...",
  isLoading = false
}: SwipeButtonProps) => {
  return (
    <Button 
      onClick={onComplete}
      className={cn(
        "w-full",
        isLoading ? "opacity-70 pointer-events-none" : "",
        className
      )}
      disabled={isLoading}
    >
      {isLoading ? loadingText : "تأكيد الطلب"}
    </Button>
  );
};

export default SwipeButton;
