
import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Slider } from '@/components/ui/slider'; 
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
  const [value, setValue] = useState([0]);
  const [isComplete, setIsComplete] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Reset the slider when closed
  useEffect(() => {
    if (!isOpen) {
      setValue([0]);
      setIsComplete(false);
    }
  }, [isOpen]);

  // Handle value change
  useEffect(() => {
    if (value[0] >= 90 && !isComplete) {
      setIsComplete(true);
      onComplete();
    }
  }, [value, isComplete, onComplete]);

  return (
    <Drawer direction="right" open={isOpen} onOpenChange={setIsOpen}>
      <div 
        className={cn(
          "w-full bg-primary text-primary-foreground py-4 rounded-lg relative flex items-center justify-center cursor-pointer",
          isLoading ? "opacity-70 pointer-events-none" : "",
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <span className="flex items-center gap-2 font-medium">
          {isLoading ? loadingText : "اسحب لتأكيد الطلب"} 
          <ArrowLeft className="h-4 w-4 animate-bounce-x" />
        </span>
      </div>
      
      <DrawerContent className="h-[20%] p-4 flex flex-col justify-center items-center">
        <div className="text-center mb-4">
          <h4 className="font-bold">اسحب لتأكيد الطلب</h4>
          <p className="text-sm text-muted-foreground">اسحب الشريط للنهاية لتأكيد طلبك</p>
        </div>
        
        <div className="relative w-full px-8">
          <Slider
            dir="rtl"
            value={value}
            onValueChange={setValue}
            max={100}
            step={1}
            className="cursor-grab active:cursor-grabbing"
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center pl-2 pointer-events-none">
            <ArrowRight size={18} className="text-primary" />
          </div>
          
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <div className="bg-primary rounded-full h-5 w-5 flex items-center justify-center">
              {value[0] >= 90 ? "✓" : ""}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SwipeButton;
