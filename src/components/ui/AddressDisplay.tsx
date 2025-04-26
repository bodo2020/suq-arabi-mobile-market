
import React from 'react';
import { MapPin, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AddressDisplayProps {
  address: string;
  onEdit: () => void;
  areaName?: string;
  className?: string;
}

const AddressDisplay = ({ address, onEdit, areaName, className }: AddressDisplayProps) => {
  return (
    <div className={cn("flex items-start justify-between p-4 bg-muted/30 rounded-lg", className)}>
      <div className="flex gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{areaName}</p>
          <p className="text-sm text-muted-foreground">{address}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default AddressDisplay;
