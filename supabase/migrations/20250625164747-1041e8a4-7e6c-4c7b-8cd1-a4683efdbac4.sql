
-- Add missing foreign key columns to customer_addresses table
ALTER TABLE public.customer_addresses 
ADD COLUMN IF NOT EXISTS governorate_id uuid REFERENCES public.governorates(id),
ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id),
ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id),
ADD COLUMN IF NOT EXISTS neighborhood_id uuid REFERENCES public.neighborhoods(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_addresses_governorate_id ON public.customer_addresses(governorate_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_city_id ON public.customer_addresses(city_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_area_id ON public.customer_addresses(area_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_neighborhood_id ON public.customer_addresses(neighborhood_id);
