
import { supabase } from '@/lib/supabase';

export const calculateDiscount = (subtotal: number, discountType: string, discountValue: number, maxDiscount?: number) => {
  let discount = 0;
  if (discountType === 'percentage') {
    discount = (subtotal * discountValue) / 100;
  } else if (discountType === 'fixed') {
    discount = discountValue;
  }
  
  if (maxDiscount && discount > maxDiscount) {
    discount = maxDiscount;
  }
  
  return discount;
};

export const getApplicableOffers = async (subtotal: number) => {
  try {
    const { data: offers } = await supabase
      .from('special_offers')
      .select('*')
      .lte('min_order_amount', subtotal)
      .eq('active', true);
      
    return offers || [];
  } catch (error) {
    console.error('Error fetching offers:', error);
    return [];
  }
};

export const getFreeDeliveryOffer = async (subtotal: number) => {
  try {
    const { data: offer } = await supabase
      .from('special_offers')
      .select('*')
      .eq('offer_type', 'free_delivery')
      .eq('active', true)
      .lte('min_order_amount', subtotal)
      .single();

    return offer || null;
  } catch (error) {
    console.error('Error fetching free delivery offer:', error);
    return null;
  }
};

export const applyCoupon = async (code: string, subtotal: number) => {
  const { data: offer } = await supabase
    .from('special_offers')
    .select('*')
    .ilike('code', code)
    .eq('active', true)
    .maybeSingle();
    
  if (!offer) {
    throw new Error('كود الخصم غير صالح');
  }
  
  if (offer.min_order_amount && subtotal < offer.min_order_amount) {
    throw new Error(`الحد الأدنى للطلب ${offer.min_order_amount} ج.م`);
  }
  
  const discount = calculateDiscount(subtotal, offer.discount_type, offer.discount_value, offer.max_discount);
  return { offer, discount };
};
