
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// نحضر العروض الفعالة من جدول special_offers
export function useOffers() {
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      setIsLoading(true);
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("special_offers")
        .select("*")
        .eq("active", true)
        .or(`expiry_date.is.null,expiry_date.gte.${now}`); // اعرض الغير منتهية فقط

      setOffers(data || []);
      setIsLoading(false);
    }
    fetchOffers();
  }, []);

  return { offers, isLoading };
}
