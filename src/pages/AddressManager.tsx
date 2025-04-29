import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Edit, MapPin, Plus, Trash } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddressWithNames } from '@/types/address';

const AddressManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const [addresses, setAddresses] = useState<AddressWithNames[]>([]);
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);
  const [openAlert, setOpenAlert] = useState(false);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('customer_addresses')
            .select(`
              *,
              governorates(id, name),
              cities(id, name),
              areas(id, name),
              neighborhoods(id, name)
            `)
            .eq('user_id', user.id)
            .order('is_default', { ascending: false });

          if (error) {
            throw error;
          }

          if (data) {
            // Type assertion to AddressWithNames[]
            setAddresses(data as AddressWithNames[]);
          }
        } catch (error) {
          console.error('Error fetching addresses:', error);
          toast({
            variant: "destructive",
            title: "خطأ",
            description: "حدث خطأ أثناء تحميل العناوين"
          });
        }
      }
    };

    fetchAddresses();
  }, [user, toast]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleDelete = (id: string) => {
    setDeleteAddressId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    if (!deleteAddressId) return;

    try {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', deleteAddressId)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      setAddresses(addresses.filter(address => address.id !== deleteAddressId));
      setOpenAlert(false);
      toast({
        title: "تم حذف العنوان",
        description: "تم حذف العنوان بنجاح"
      });
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء حذف العنوان"
      });
    } finally {
      setDeleteAddressId(null);
    }
  };

  const cancelDelete = () => {
    setOpenAlert(false);
    setDeleteAddressId(null);
  };

  return (
    <MainLayout>
      <div className="py-4">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">إدارة العناوين</h1>
          <div className="w-10"></div>
        </div>

        <div className="space-y-4">
          {addresses.map(address => (
            <div key={address.id} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center mb-2">
                    <MapPin size={16} className="ml-2 text-gray-500" />
                    <span className="font-medium">{address.areas?.name} {address.neighborhoods?.name ? `- ${address.neighborhoods?.name}` : ''}</span>
                  </div>
                  <p className="text-sm text-gray-500">{address.address}</p>
                  {address.is_default && (
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        العنوان الافتراضي
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Link to={`/edit-address/${address.id}`} className="text-gray-500 hover:text-gray-700">
                    <Edit size={16} />
                  </Link>
                  <button onClick={() => handleDelete(address.id)} className="text-red-500 hover:text-red-700">
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button asChild className="w-full mt-6">
          <Link to="/add-address" className="flex items-center justify-center w-full">
            <Plus size={16} className="ml-2" />
            إضافة عنوان جديد
          </Link>
        </Button>
      </div>

      <AlertDialog open={openAlert} onOpenChange={setOpenAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد حذف هذا العنوان؟ لا يمكنك التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default AddressManager;
