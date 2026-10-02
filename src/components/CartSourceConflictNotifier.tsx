import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

type ConflictDetail = {
  reason?: 'partner_limit' | 'hub_mismatch' | 'not_eligible';
  currentMerchant?: string;
  incomingMerchant?: string;
  partnerCount?: number;
};

export default function CartSourceConflictNotifier() {
  const { toast } = useToast();

  useEffect(() => {
    const onConflict = (event: Event) => {
      const detail = (event as CustomEvent<ConflictDetail>).detail || {};
      if (detail.reason === 'partner_limit') {
        toast({
          title: 'وصلت للحد الأقصى للمحلات الشريكة',
          description: 'تقدر تجمع فرع ســــــوبـرمــــاركو مع محلين شركاء بحد أقصى. احذف محل شريك من السلة قبل إضافة ' + (detail.incomingMerchant || 'المتجر الجديد') + '.',
          variant: 'destructive',
        });
        return;
      }
      if (detail.reason === 'hub_mismatch') {
        toast({
          title: 'المتجر مش على نفس رحلة التوصيل',
          description: 'المحلات المجمعة لازم تكون تابعة لنفس فرع ســــــوبـرمــــاركو المسؤول عن عنوانك.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'المتجر غير مؤهل للدمج حاليًا',
        description: (detail.incomingMerchant || 'المتجر') + ' محتاج طلب منفصل حسب إعدادات التوصيل الحالية.',
        variant: 'destructive',
      });
    };
    window.addEventListener('cart-source-conflict', onConflict);
    return () => window.removeEventListener('cart-source-conflict', onConflict);
  }, [toast]);

  return null;
}
