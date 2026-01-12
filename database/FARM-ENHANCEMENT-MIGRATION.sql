-- FARM SCHEMA ENHANCEMENT MIGRATION
-- Add columns for animal type, farm categorization, and GPS coordinates

-- Add new columns to farms table
ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS animal_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS farm_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS chicken_type VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN farms.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN farms.longitude IS 'GPS longitude coordinate';
COMMENT ON COLUMN farms.animal_type IS 'Type of animal: Swine or Poultry';
COMMENT ON COLUMN farms.farm_type IS 'Type of farm based on animal type';
COMMENT ON COLUMN farms.chicken_type IS 'Type of chicken (only for Poultry farms)';

-- Create index for faster filtering by animal type
CREATE INDEX IF NOT EXISTS idx_farms_animal_type ON farms(animal_type);
