import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import DeliveryMap, { Coordinates } from '@/components/ui/DeliveryMap';
import { toast } from '@/hooks/use-toast';
import { readGuestAddress, resolveDeliveryLocation, saveGuestAddress } from '@/lib/deliveryAddress';

interface AddressSelectorProps {
  onAddressSelect: (addressData: any) => void;
  children?: React.ReactNode;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({ onAddressSelect, children }) => {
  const [open, setOpen] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = readGuestAddress();
    if (!saved) return;
    setCoordinates({ lat: saved.latitude, lng: saved.longitude });
    setAddressText(saved.address || '');
  }, []);

  const handleSave = async () => {
    if (!coordinates) {
      toast({ title: 'حدد مكانك', description: 'حرّك الخريطة لحد ما الدبوس يبقى عند باب البيت.', variant: 'destructive' });
      return;
    }
    if (!addressText.trim()) {
      toast({ title: 'كمّل تفاصيل العنوان', description: 'اكتب الشارع ورقم البيت أو أي علامة مميزة.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const match = await resolveDeliveryLocation(coordinates.lat, coordinates.lng);
      if (!match) {
        toast({ title: 'العنوان خارج نطاق التوصيل', description: 'التوصيل متاح حاليًا داخل 10 كم من فرع ســــــوبـرمــــاركو.', variant: 'destructive' });
        return;
      }

      const addressData = {
        address: addressText.trim(),
        full_address: addressText.trim(),
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        assigned_branch_id: match.branch_id,
        branch_name: match.branch_name,
        distance_km: Number(match.distance_km),
        delivery_price: Number(match.delivery_fee || 0),
        estimated_time: match.estimated_delivery_minutes,
        is_deliverable: true as const,
      };

      saveGuestAddress(addressData);
      onAddressSelect(addressData);
      setOpen(false);
      toast({ title: 'تم تحديد العنوان', description: `التوصيل من ${match.branch_name} — يبعد ${Number(match.distance_km).toFixed(1)} كم.` });
    } catch (error) {
      console.error('Error resolving delivery address:', error);
      toast({ title: 'تعذر التحقق من العنوان', description: 'حاول مرة تانية بعد شوية.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{children || <Button variant="outline" className="w-full justify-start"><MapPin className="w-4 h-4 ml-2" />اختر العنوان</Button>}</DialogTrigger>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
      <DialogHeader><DialogTitle className="text-center">حدد عنوان التوصيل</DialogTitle></DialogHeader>
      <div className="space-y-5">
        <DeliveryMap value={coordinates} onChange={setCoordinates} onAddressResolved={value => { if (!addressText.trim()) setAddressText(value); }} />
        <div>
          <label className="mb-2 block text-sm font-bold">تفاصيل العنوان</label>
          <textarea value={addressText} onChange={event => setAddressText(event.target.value)} placeholder="الشارع، رقم البيت، الدور، الشقة أو علامة مميزة" className="min-h-24 w-full resize-none rounded-xl border p-3 leading-7" rows={3} />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading} className="flex-1 min-h-12">{loading ? 'بنتأكد من نطاق التوصيل…' : 'استخدام العنوان'}</Button>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="min-h-12">إلغاء</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
};

export default AddressSelector;
