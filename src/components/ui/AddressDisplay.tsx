
import React from 'react';
import { MapPin, Edit } from 'lucide-react';
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
}

const AddressDisplay = ({ address, onEdit, areaName, className, showAddressSelector = false }: AddressDisplayProps) => {
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
    <div className={cn("flex items-start justify-between p-4 bg-muted/30 rounded-lg", className)}>
      <div className="flex gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{areaName}</p>
          <p className="text-sm text-muted-foreground">{address}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {showAddressSelector && addresses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                تغيير العنوان
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {addresses.map((addr) => (
                <DropdownMenuItem 
                  key={addr.id}
                  onClick={() => handleAddressSelect(addr.id)}
                >
                  {addr.areas?.name || ''}
                  {addr.areas?.name && addr.neighborhoods?.name ? '، ' : ''}
                  {addr.neighborhoods?.name || ''}
                  {(addr.areas?.name || addr.neighborhoods?.name) ? ' - ' : ''}
                  {addr.address}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AddressDisplay;
