
import { supabase } from "@/lib/supabase";

export async function getDeliveryTypes() {
  const { data, error } = await supabase
    .from('delivery_types')
    .select('*')
    .eq('active', true);
  
  if (error) {
    console.error('Error fetching delivery types:', error);
    return [];
  }
  return data;
}

export async function getDeliveryPrice(deliveryTypeId: string, neighborhoodId: string) {
  const { data, error } = await supabase
    .from('delivery_type_pricing')
    .select('*')
    .eq('delivery_type_id', deliveryTypeId)
    .eq('delivery_location_id', neighborhoodId)
    .single();
  
  if (error) {
    console.error('Error fetching delivery price:', error);
    return 0;
  }
  return data?.price || 0;
}
