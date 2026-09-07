
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { applyCoupon } from '@/utils/offerUtils';

interface CouponInputProps {
  subtotal?: number;
  onApply: (discount: number) => void;
}

const CouponInput = ({
  subtotal = 0,
  onApply
}: CouponInputProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleApplyCoupon = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { discount } = await applyCoupon(code, subtotal);
      onApply(discount);
      toast({
        title: "تم تطبيق الكوبون",
        description: `تم خصم ${discount.toFixed(2)} ج.م من طلبك`
      });
      setCode('');
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تطبيق الكوبون",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input 
          placeholder="كود الخصم" 
          value={code} 
          onChange={e => setCode(e.target.value)} 
          className="pl-10" 
        />
      </div>
      <Button 
        onClick={handleApplyCoupon} 
        disabled={loading || !code.trim()}
      >
        {loading ? "جاري التطبيق..." : "تطبيق"}
      </Button>
    </div>
  );
};

export default CouponInput;

