
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// نحضر العروض الفعالة من جدول special_offers
export function useOffers() {
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      try {
        setIsLoading(true);
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("special_offers")
          .select("*")
          .eq("active", true)
          .or(`expiry_date.is.null,expiry_date.gte.${now}`); // اعرض الغير منتهية فقط

        if (error) {
          console.error('Error fetching offers:', error);
          throw error;
        }

        setOffers(data || []);
      } catch (err) {
        console.error('Failed to load offers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchOffers();
  }, []);

  return { offers, isLoading };
}
