
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// يجلب عناوين العميل مع إمكانية تعيين الافتراضي
export function useAddresses(userId: string | null | undefined) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setAddresses([]); return; }
    setIsLoading(true);
    supabase.from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        setAddresses(data || []);
        setIsLoading(false);
      });
  }, [userId]);

  return { addresses, isLoading };
}
