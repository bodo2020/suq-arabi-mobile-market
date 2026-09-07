
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';

interface OrderNotesProps {
  value: string;
  onChange: (value: string) => void;
}

const OrderNotes = ({ value, onChange }: OrderNotesProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Label>ملاحظات إضافية</Label>
      </div>
      <Textarea
        placeholder="أي ملاحظات إضافية حول طلبك..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-none"
        rows={3}
      />
    </div>
  );
};

export default OrderNotes;

