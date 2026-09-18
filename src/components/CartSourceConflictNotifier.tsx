import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function CartSourceConflictNotifier() {
  const { toast } = useToast();

  useEffect(() => {
    const onConflict = (event: Event) => {
      const detail = (event as CustomEvent<{ currentMerchant?: string; incomingMerchant?: string }>).detail || {};
      toast({
        title: 'السلة مرتبطة بمتجر آخر',
        description: `سلتك الحالية من ${detail.currentMerchant || 'متجر آخر'}. أنهِها أو أفرغها قبل إضافة منتجات من ${detail.incomingMerchant || 'المتجر الجديد'}.`,
        variant: 'destructive',
      });
    };
    window.addEventListener('cart-source-conflict', onConflict);
    return () => window.removeEventListener('cart-source-conflict', onConflict);
  }, [toast]);

  return null;
}
