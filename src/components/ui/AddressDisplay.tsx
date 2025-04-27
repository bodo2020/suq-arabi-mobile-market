
import React from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

interface AddressDisplayProps {
  address?: string;
  onEdit: () => void;
  areaName?: string;
  className?: string;
  showAddressSelector?: boolean;
  neighborhoodName?: string;
}

const AddressDisplay = ({ areaName, className, showAddressSelector = false, neighborhoodName }: AddressDisplayProps) => {
  const { user } = useUser();
  const { toast } = useToast();

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
    enabled: !!user?.id,
  });

  const handleAddressSelect = async (addressId: string) => {
    if (!user) return;

    try {
      // Update is_default flag for all addresses
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set selected address as default
      await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      // Store address information in localStorage
      const selectedAddress = addresses.find(addr => addr.id === addressId);
      if (selectedAddress) {
        localStorage.setItem('userAddress', selectedAddress.address || '');
        localStorage.setItem('userArea', selectedAddress.areas?.name || '');
        localStorage.setItem('userNeighborhood', selectedAddress.neighborhoods?.name || '');
        
        // Also update the customer record in the database with location information
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

      // Refresh addresses data
      await refetch();

      toast({
        title: "تم تحديث العنوان",
        description: "تم تغيير العنوان الافتراضي بنجاح",
      });

      // Force a page reload to reflect the changes everywhere
      window.location.reload();
    } catch (error) {
      console.error('Error updating default address:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث العنوان",
      });
    }
  };

  return (
    <div className={cn("flex items-center justify-between p-4 bg-muted/30 rounded-lg", className)}>
      <div className="flex gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">
            {!neighborhoodName && !areaName ? 'لا يوجد عنوان محدد' : (
              <>
                {neighborhoodName}
                {neighborhoodName && areaName && '، '}
                {areaName}
              </>
            )}
          </p>
        </div>
      </div>
      {showAddressSelector && addresses.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-primary">
              تغيير العنوان
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {addresses.map((addr) => (
              <DropdownMenuItem 
                key={addr.id}
                onClick={() => handleAddressSelect(addr.id)}
              >
                {addr.neighborhoods?.name}
                {addr.neighborhoods?.name && addr.areas?.name ? '، ' : ''}
                {addr.areas?.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default AddressDisplay;
