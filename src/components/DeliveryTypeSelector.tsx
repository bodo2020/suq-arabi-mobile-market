
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeliveryOption {
  id: string;
  name: string;
  description?: string;
  price: number;
}

export interface DeliveryTypeSelectorProps {
  options: DeliveryOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const DeliveryTypeSelector = ({ options, selectedId, onSelect }: DeliveryTypeSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <Truck size={18} className="ml-2 text-gray-500" />
        <span className="font-medium">اختر طريقة التوصيل</span>
      </div>
      
      <RadioGroup value={selectedId} onValueChange={onSelect}>
        <div className="space-y-2">
          {options.map((option) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border",
                selectedId === option.id ? "border-primary bg-primary/5" : "border-gray-200"
              )}
            >
              <div className="flex items-center flex-1">
                <RadioGroupItem value={option.id} id={option.id} className="ml-3" />
                <div>
                  <label htmlFor={option.id} className="font-medium block">{option.name}</label>
                  {option.description && (
                    <span className="text-sm text-gray-500 block">{option.description}</span>
                  )}
                </div>
              </div>
              <div className="text-left">
                <span className="font-medium">{option.price.toFixed(2)} ج.م</span>
              </div>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
};

export default DeliveryTypeSelector;
