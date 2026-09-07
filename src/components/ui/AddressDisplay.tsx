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
  onEdit?: () => void;
  areaName?: string;
  className?: string;
  showAddressSelector?: boolean;
  neighborhoodName?: string;
  latitude?: number;
  longitude?: number;
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

  return (
    <div className={cn("flex items-center gap-2 mb-2", className)}>
      <div className="flex items-center flex-1">
        <MapPin size={18} className="text-current mr-2" />
        <div className="flex items-center text-sm font-medium">
          <span className="opacity-90">التوصيل إلى</span>
          <span className="mr-2 font-bold underline decoration-2 underline-offset-2">
            {areaName || address || "اختر عنوانك"}
            {neighborhoodName && <span className="mr-1">، {neighborhoodName}</span>}
          </span>
          {(areaName || address) && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full mr-2">
              افتراضي
            </span>
          )}
        </div>
        
        {showAddressSelector && user && addresses.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-2 text-xs opacity-75 hover:opacity-100 transition-opacity">
                تغيير
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white">
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
        ) : null}
      </div>
      
      {!showAddressSelector && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onEdit || handleChangeAddress} 
          className="text-xs text-current opacity-75 hover:opacity-100"
        >
          {address ? "تغيير" : "إضافة"}
        </Button>
      )}
    </div>
  );

  async function handleAddressSelect(addressId: string) {
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
  }

  function handleChangeAddress() {
    if (user) {
      navigate('/address-manager');
    } else {
      navigate('/add-address');
    }
  }
};

export default AddressDisplay;

