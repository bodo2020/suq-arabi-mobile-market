
import React from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useGuestLocation } from '@/hooks/useGuestLocation';
import { useUser } from '@/contexts/UserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface SimpleAddressDisplayProps {
  className?: string;
}

const SimpleAddressDisplay: React.FC<SimpleAddressDisplayProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { guestLocation } = useGuestLocation();

  // Fetch user's default address if logged in
  const { data: userAddress } = useQuery({
    queryKey: ['userDefaultAddress', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();
        
      return data;
    },
    enabled: !!user?.id
  });

  const handleChangeLocation = () => {
    navigate('/simple-map');
  };

  // Determine what address to show
  const displayAddress = user ? userAddress?.address : guestLocation?.address;
  const hasLocation = user ? !!userAddress : !!guestLocation;

  return (
    <div className={`flex items-center gap-2 mb-2 ${className}`}>
      <div className="flex items-center flex-1">
        <MapPin size={18} className="text-primary mr-1" />
        <div className="text-sm">
          {hasLocation ? displayAddress : "لم يتم تحديد عنوان"}
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleChangeLocation} 
        className="text-xs"
      >
        {hasLocation ? "تغيير" : "تحديد"}
      </Button>
    </div>
  );
};

export default SimpleAddressDisplay;
