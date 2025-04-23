
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// يجلب عناوين العميل مع إمكانية تعيين الافتراضي
export function useAddresses(userId: string | null | undefined) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) { 
      setAddresses([]); 
      setIsLoading(false);
      return; 
    }
    
    async function fetchAddresses() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('customer_addresses')
          .select('*, governorates(name) as governorate_name, cities(name) as city_name, areas(name) as area_name, neighborhoods(name) as neighborhood_name')
          .eq('user_id', userId);
          
        if (error) {
          console.error('Error fetching addresses:', error);
          throw error;
        }
        
        setAddresses(data || []);
      } catch (err) {
        console.error('Failed to load addresses:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAddresses();
  }, [userId]);

  return { addresses, isLoading };
}
