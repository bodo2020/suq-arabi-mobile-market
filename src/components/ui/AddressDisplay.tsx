import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { customerRpc } from '@/lib/customerPersistence';
import { readGuestAddress } from '@/lib/deliveryAddress';
import { loadMyAddresses, loadMyCustomer } from '@/lib/customerProfileCache';
import { invalidateMyAddresses } from '@/lib/customerProfileCache';

interface AddressDisplayProps {
  address?: string;
  onEdit?: () => void;
  areaName?: string;
  neighborhoodName?: string;
  className?: string;
  showAddressSelector?: boolean;
  latitude?: number;
  longitude?: number;
}

type MapAddress = {
  id: string;
  address: string;
  is_default?: boolean | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  is_deliverable?: boolean | null;
  distance_km?: number | string | null;
};

const AddressDisplay = ({ address, className, showAddressSelector = false, onEdit }: AddressDisplayProps) => {
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const guest = !user ? readGuestAddress() : null;

  const { data: addresses = [], refetch } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as MapAddress[];
      return (await loadMyAddresses(user.id)) as unknown as MapAddress[];
    },
    enabled: !!user?.id,
  });

  const displayAddress = address || guest?.address || 'اختر عنوانك';

  return <div className={cn('flex items-center gap-2 mb-2', className)}>
    <div className="flex min-w-0 flex-1 items-center">
      <MapPin size={18} className="ml-2 shrink-0 text-current" />
      <div className="min-w-0 flex-1 text-sm font-medium">
        <span className="opacity-80">التوصيل إلى </span>
        <span className="font-bold">{displayAddress}</span>
        {(address || guest) && <span className="mr-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">محدد على الخريطة</span>}
      </div>

      {showAddressSelector && user && addresses.length > 0 && <DropdownMenu>
        <DropdownMenuTrigger asChild><button className="mr-2 shrink-0 text-xs font-medium opacity-75 hover:opacity-100">تغيير</button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-white">
          {addresses.map(addr => {
            const mapped = addr.latitude != null && addr.longitude != null;
            return <DropdownMenuItem key={addr.id} disabled={!mapped} onClick={() => mapped && void handleAddressSelect(addr.id)}>
              <div className={cn('flex w-full flex-col gap-1', addr.is_default && 'font-bold')}>
                <span className="line-clamp-2">{addr.address || 'عنوان بدون تفاصيل'}</span>
                <span className={cn('flex items-center gap-1 text-xs', mapped ? 'text-primary' : 'text-amber-700')}><Navigation size={12} />{mapped ? (addr.distance_km != null ? `يبعد ${Number(addr.distance_km).toFixed(1)} كم` : 'محدد على الخريطة') : 'يحتاج تحديد الموقع على الخريطة'}</span>
                {addr.is_default && <span className="text-xs text-primary">العنوان الافتراضي</span>}
              </div>
            </DropdownMenuItem>;
          })}
        </DropdownMenuContent>
      </DropdownMenu>}
    </div>

    {!showAddressSelector && <Button variant="ghost" size="sm" onClick={onEdit || handleChangeAddress} className="shrink-0 text-xs text-current opacity-75 hover:opacity-100">{address || guest ? 'تغيير' : 'إضافة'}</Button>}
  </div>;

  async function handleAddressSelect(addressId: string) {
    if (!user) return;
    try {
      const { error } = await customerRpc('set_default_customer_address', { p_address_id: addressId });
      invalidateMyAddresses();
      if (error) throw error;
      const selected = addresses.find(item => item.id === addressId);
      if (selected) {
        localStorage.setItem('userAddress', selected.address || '');
        localStorage.setItem('userArea', 'عنوان على الخريطة');
        localStorage.removeItem('userNeighborhood');
      }
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['delivery-branch-id'] });
      await queryClient.invalidateQueries({ queryKey: ['active-products'] });
      await queryClient.invalidateQueries({ queryKey: ['home-default-address', user.id] });
      window.dispatchEvent(new CustomEvent('delivery-address-changed', { detail: { addressId } }));
      window.dispatchEvent(new Event('customer-profile-ready'));
      toast({ title: 'تم تحديث العنوان', description: 'تم تحديث الفرع والمخزون والأسعار حسب العنوان الجديد.' });
    } catch (error) {
      console.error('Error updating default address:', error);
      toast({ variant: 'destructive', title: 'تعذر تغيير العنوان', description: 'حاول مرة تانية.' });
    }
  }

  function handleChangeAddress() {
    navigate(user ? '/addresses' : '/add-address');
  }
};

export default AddressDisplay;
