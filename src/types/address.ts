
import { Address } from '@/lib/supabase';

export interface AddressWithNames extends Omit<Address, 'governorates' | 'cities' | 'areas' | 'neighborhoods'> {
  governorates: {
    id: string;
    name: string;
  };
  cities: {
    id: string;
    name: string;
  };
  areas: {
    id: string;
    name: string;
  };
  neighborhoods: {
    id: string;
    name: string;
  };
}
