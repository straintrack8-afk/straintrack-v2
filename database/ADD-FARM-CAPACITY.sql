-- Add capacity column to farms table
ALTER TABLE public.farms 
ADD COLUMN IF NOT EXISTS capacity INTEGER;

COMMENT ON COLUMN public.farms.capacity IS 'Maximum animal capacity of the farm';
