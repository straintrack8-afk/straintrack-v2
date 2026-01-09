-- UPDATE EXISTING FARMS WITH NEW DATA
-- Run this AFTER running FARM-ENHANCEMENT-MIGRATION.sql
-- This updates existing farms with animal type, farm type, and coordinates

-- Update existing Swine farms
UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Breeder - GGP',
    latitude = 21.0285,
    longitude = 105.8542
WHERE name = 'Hanoi Swine Farm';

UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Breeder - GP',
    latitude = 20.8449,
    longitude = 106.6881
WHERE name = 'Hai Phong Pig Farm';

UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Breeder - PS',
    latitude = 20.4388,
    longitude = 106.1621
WHERE name = 'Nam Dinh Swine Center';

UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Nursery',
    latitude = 20.4464,
    longitude = 106.3365
WHERE name = 'Thai Binh Pig Ranch';

UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Fattening',
    latitude = 21.3609,
    longitude = 105.5474
WHERE name = 'Vinh Phuc Swine Farm';

UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Breeder - GGP',
    latitude = 21.1861,
    longitude = 106.0763
WHERE name = 'Bac Ninh Pig Farm';

UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Nursery',
    latitude = 20.6464,
    longitude = 106.0511
WHERE name = 'Hung Yen Swine Ranch';

UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Fattening',
    latitude = 20.5835,
    longitude = 105.9230
WHERE name = 'Ha Nam Pig Center';

UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Breeder - PS',
    latitude = 20.2506,
    longitude = 105.9745
WHERE name = 'Ninh Binh Swine Farm';

UPDATE farms SET 
    animal_type = 'Swine',
    farm_type = 'Fattening',
    latitude = 20.6861,
    longitude = 105.3388
WHERE name = 'Hoa Binh Pig Farm';

-- Update existing Poultry farms
UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Breeder',
    chicken_type = 'Broiler',
    latitude = 16.0544,
    longitude = 108.2022
WHERE name = 'Da Nang Poultry Farm';

UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Commercial Farm',
    chicken_type = 'Layer',
    latitude = 16.4637,
    longitude = 107.5909
WHERE name = 'Hue Chicken Farm';

UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Hatchery',
    chicken_type = 'Broiler',
    latitude = 15.5394,
    longitude = 108.0191
WHERE name = 'Quang Nam Poultry Center';

UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Commercial Farm',
    chicken_type = 'Broiler',
    latitude = 12.2388,
    longitude = 109.1967
WHERE name = 'Nha Trang Chicken Ranch';

UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Breeder',
    chicken_type = 'Layer',
    latitude = 10.8231,
    longitude = 106.6297
WHERE name = 'Ho Chi Minh Poultry Farm';

UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Commercial Farm',
    chicken_type = 'Broiler',
    latitude = 10.9465,
    longitude = 107.1435
WHERE name = 'Dong Nai Chicken Farm';

UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Hatchery',
    chicken_type = 'Layer',
    latitude = 11.3254,
    longitude = 106.4770
WHERE name = 'Binh Duong Poultry Center';

UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Commercial Farm',
    chicken_type = 'Duck',
    latitude = 10.0452,
    longitude = 105.7469
WHERE name = 'Can Tho Chicken Farm';

UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Breeder',
    chicken_type = 'Color Chicken',
    latitude = 10.6956,
    longitude = 106.2431
WHERE name = 'Long An Poultry Ranch';

UPDATE farms SET 
    animal_type = 'Poultry',
    farm_type = 'Commercial Farm',
    chicken_type = 'Layer',
    latitude = 10.4493,
    longitude = 106.3420
WHERE name = 'Tien Giang Chicken Center';
