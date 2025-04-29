import React from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface AddressDisplayProps {
  address?: string;
  onEdit: () => void;
  areaName?: string;
  className?: string;
  showAddressSelector?: boolean;
  neighborhoodName?: string;
}

const AddressDisplay = ({
  address,
  areaName,
  className,
  showAddressSelector = false,
  neighborhoodName,
  onEdit
}: AddressDisplayProps) => {
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { data: addresses = [], refetch } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('customer_addresses')
        .select(`
          *,
          governorates(name),
          cities(name),
          areas(name),
          neighborhoods(name)
        `)
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id
  });

  const handleAddressSelect = async (addressId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      const selectedAddress = addresses.find(addr => addr.id === addressId);
      if (selectedAddress) {
        localStorage.setItem('userAddress', selectedAddress.address || '');
        localStorage.setItem('userArea', selectedAddress.areas?.name || '');
        localStorage.setItem('userNeighborhood', selectedAddress.neighborhoods?.name || '');

        await supabase
          .from('customers')
          .update({
            governorate_id: selectedAddress.governorate_id,
            city_id: selectedAddress.city_id,
            area_id: selectedAddress.area_id,
            neighborhood_id: selectedAddress.neighborhood_id,
            address: selectedAddress.address
          })
          .eq('user_id', user.id);
      }

      await refetch();
      toast({
        title: "تم تحديث العنوان",
        description: "تم تغيير العنوان الافتراضي بنجاح"
      });

      window.location.reload();
    } catch (error) {
      console.error('Error updating default address:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث العنوان"
      });
    }
  };

  const handleChangeAddress = () => {
    navigate('/add-address');
  };

  return (
    <div className={cn("flex items-center gap-2 mb-2", className)}>
      <div className="flex items-center flex-1">
        <MapPin size={18} className="text-primary mr-1" />
        {showAddressSelector && user && addresses.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center text-sm hover:underline">
                {areaName || address || "اختر عنوانك"}
                {neighborhoodName && <span className="text-gray-500 mr-1">- {neighborhoodName}</span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {addresses.map((addr) => (
                <DropdownMenuItem key={addr.id} onClick={() => handleAddressSelect(addr.id)}>
                  <div className={cn("flex flex-col w-full", addr.is_default && "font-bold")}>
                    <span>
                      {addr.areas?.name} {addr.neighborhoods?.name ? `- ${addr.neighborhoods?.name}` : ''}
                    </span>
                    {addr.address && <span className="text-xs text-gray-500">{addr.address}</span>}
                    {addr.is_default && <span className="text-xs text-primary">العنوان الافتراضي</span>}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="text-sm">
            {areaName || address || "لم يتم تحديد عنوان"}
            {neighborhoodName && <span className="text-gray-500 mr-1">- {neighborhoodName}</span>}
          </div>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={handleChangeAddress} className="text-xs">
        تغيير
      </Button>
    </div>
  );
};

export default AddressDisplay;
