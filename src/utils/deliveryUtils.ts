
import { supabase } from "@/integrations/supabase/client";

interface DeliveryPriceResult {
  price: number;
  priceMap: Record<string, number>;
}

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

export async function getDeliveryPrice(areaId: string, deliveryTypeId: string): Promise<DeliveryPriceResult | null> {
  try {
    // Get delivery price for specific delivery type and area
    const { data, error } = await supabase
      .from('delivery_type_pricing')
      .select('*')
      .eq('delivery_type_id', deliveryTypeId)
      .eq('delivery_location_id', areaId)
      .single();
    
    if (error) {
      console.error('Error fetching delivery price:', error);
      return null;
    }
    
    // Get all prices for this area with different delivery types
    const { data: allPrices, error: allPricesError } = await supabase
      .from('delivery_type_pricing')
      .select('delivery_type_id, price')
      .eq('delivery_location_id', areaId);
      
    if (allPricesError) {
      console.error('Error fetching all delivery prices:', allPricesError);
      return {
        price: data?.price || 0,
        priceMap: {}
      };
    }
    
    // Create a price map for all delivery types
    const priceMap: Record<string, number> = {};
    allPrices?.forEach(item => {
      priceMap[item.delivery_type_id] = item.price;
    });
    
    return {
      price: data?.price || 0,
      priceMap
    };
  } catch (error) {
    console.error('Error in getDeliveryPrice:', error);
    return null;
  }
}

// Add the missing calculateDeliveryFee function
export function calculateDeliveryFee(location: string | undefined): number {
  // A simple implementation that returns a delivery fee based on the location
  if (!location) return 0;
  
  // This could be expanded with more sophisticated logic
  // For now, just return a base fee
  return 20;
}
