-- DUMMY DATA FOR TESTING - StrainTrack V2 (ENHANCED)
-- Organization ID: 00711906-018c-4196-aa9a-ea636769d2a3
-- User ID: 31bd8156-d4d2-42da-a8f0-31fe452aa1bb

-- ============================================
-- STEP 0: Clean up old dummy data
-- ============================================

-- Delete old disease reports first (due to foreign key constraints)
DELETE FROM disease_reports WHERE organization_id = '00711906-018c-4196-aa9a-ea636769d2a3';

-- Delete old farms
DELETE FROM farms WHERE organization_id = '00711906-018c-4196-aa9a-ea636769d2a3';

-- ============================================
-- STEP 1: Insert Farms (20 total with complete data)
-- ============================================

-- Swine Farms in Northern Vietnam
INSERT INTO farms (organization_id, name, location, latitude, longitude, animal_type, farm_type, created_at) VALUES
('00711906-018c-4196-aa9a-ea636769d2a3', 'Hanoi Swine Farm', 'Hanoi, Vietnam', 21.0285, 105.8542, 'Swine', 'Breeder - GGP', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Hai Phong Pig Farm', 'Hai Phong, Vietnam', 20.8449, 106.6881, 'Swine', 'Breeder - GP', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Nam Dinh Swine Center', 'Nam Dinh, Vietnam', 20.4388, 106.1621, 'Swine', 'Breeder - PS', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Thai Binh Pig Ranch', 'Thai Binh, Vietnam', 20.4464, 106.3365, 'Swine', 'Nursery', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Vinh Phuc Swine Farm', 'Vinh Phuc, Vietnam', 21.3609, 105.5474, 'Swine', 'Fattening', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Bac Ninh Pig Farm', 'Bac Ninh, Vietnam', 21.1861, 106.0763, 'Swine', 'Breeder - GGP', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Hung Yen Swine Ranch', 'Hung Yen, Vietnam', 20.6464, 106.0511, 'Swine', 'Nursery', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Ha Nam Pig Center', 'Ha Nam, Vietnam', 20.5835, 105.9230, 'Swine', 'Fattening', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Ninh Binh Swine Farm', 'Ninh Binh, Vietnam', 20.2506, 105.9745, 'Swine', 'Breeder - PS', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Hoa Binh Pig Farm', 'Hoa Binh, Vietnam', 20.6861, 105.3388, 'Swine', 'Fattening', NOW());

-- Poultry Farms in Central & Southern Vietnam
INSERT INTO farms (organization_id, name, location, latitude, longitude, animal_type, farm_type, chicken_type, created_at) VALUES
('00711906-018c-4196-aa9a-ea636769d2a3', 'Da Nang Poultry Farm', 'Da Nang, Vietnam', 16.0544, 108.2022, 'Poultry', 'Breeder', 'Broiler', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Hue Chicken Farm', 'Hue, Vietnam', 16.4637, 107.5909, 'Poultry', 'Commercial Farm', 'Layer', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Quang Nam Poultry Center', 'Quang Nam, Vietnam', 15.5394, 108.0191, 'Poultry', 'Hatchery', 'Broiler', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Nha Trang Chicken Ranch', 'Nha Trang, Vietnam', 12.2388, 109.1967, 'Poultry', 'Commercial Farm', 'Broiler', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Ho Chi Minh Poultry Farm', 'Ho Chi Minh City, Vietnam', 10.8231, 106.6297, 'Poultry', 'Breeder', 'Layer', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Dong Nai Chicken Farm', 'Dong Nai, Vietnam', 10.9465, 107.1435, 'Poultry', 'Commercial Farm', 'Broiler', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Binh Duong Poultry Center', 'Binh Duong, Vietnam', 11.3254, 106.4770, 'Poultry', 'Hatchery', 'Layer', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Can Tho Chicken Farm', 'Can Tho, Vietnam', 10.0452, 105.7469, 'Poultry', 'Commercial Farm', 'Duck', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Long An Poultry Ranch', 'Long An, Vietnam', 10.6956, 106.2431, 'Poultry', 'Breeder', 'Color Chicken', NOW()),
('00711906-018c-4196-aa9a-ea636769d2a3', 'Tien Giang Chicken Center', 'Tien Giang, Vietnam', 10.4493, 106.3420, 'Poultry', 'Commercial Farm', 'Layer', NOW());

-- ============================================
-- STEP 2: Insert Disease Reports
-- ============================================

-- African Swine Fever cases
INSERT INTO disease_reports (
    organization_id, farm_id, created_by, animal_species, outbreak_location,
    onset_date, disease_name, strain_subtype, severity, sick_count, death_count, total_population,
    created_at
) VALUES
('00711906-018c-4196-aa9a-ea636769d2a3', 
 (SELECT id FROM farms WHERE name = 'Hanoi Swine Farm' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Swine', 'Hanoi, Vietnam',
 NOW() - INTERVAL '5 days', 'African Swine Fever', 'Genotype II', 'High', 45, 12, 500,
 NOW() - INTERVAL '5 days'),

('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Thai Binh Pig Ranch' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Swine', 'Thai Binh, Vietnam',
 NOW() - INTERVAL '3 days', 'African Swine Fever', 'Genotype I', 'High', 67, 23, 800,
 NOW() - INTERVAL '3 days'),

-- PRRS cases
('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Hai Phong Pig Farm' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Swine', 'Hai Phong, Vietnam',
 NOW() - INTERVAL '7 days', 'Porcine Reproductive and Respiratory Syndrome', 'PRRSV-2 (North American)', 'Medium', 34, 5, 600,
 NOW() - INTERVAL '7 days'),

('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Bac Ninh Pig Farm' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Swine', 'Bac Ninh, Vietnam',
 NOW() - INTERVAL '10 days', 'Porcine Reproductive and Respiratory Syndrome', 'PRRSV-1 (European)', 'Medium', 28, 3, 450,
 NOW() - INTERVAL '10 days'),

-- Foot-and-Mouth Disease
('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Nam Dinh Swine Center' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Swine', 'Nam Dinh, Vietnam',
 NOW() - INTERVAL '2 days', 'Foot-and-Mouth Disease', 'Serotype O', 'Medium', 52, 0, 700,
 NOW() - INTERVAL '2 days'),

-- Avian Influenza cases
('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Da Nang Poultry Farm' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Poultry', 'Da Nang, Vietnam',
 NOW() - INTERVAL '4 days', 'Avian Influenza', 'H5N1', 'High', 450, 120, 10000,
 NOW() - INTERVAL '4 days'),

('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Ho Chi Minh Poultry Farm' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Poultry', 'Ho Chi Minh City, Vietnam',
 NOW() - INTERVAL '6 days', 'Avian Influenza', 'H5N6', 'High', 380, 95, 8000,
 NOW() - INTERVAL '6 days'),

-- Newcastle Disease
('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Hue Chicken Farm' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Poultry', 'Hue, Vietnam',
 NOW() - INTERVAL '8 days', 'Newcastle Disease', 'Velogenic', 'Medium', 180, 25, 5000,
 NOW() - INTERVAL '8 days'),

('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Can Tho Chicken Farm' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Poultry', 'Can Tho, Vietnam',
 NOW() - INTERVAL '12 days', 'Newcastle Disease', 'Lentogenic', 'Medium', 145, 18, 6000,
 NOW() - INTERVAL '12 days'),

-- Infectious Bronchitis
('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Nha Trang Chicken Ranch' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Poultry', 'Nha Trang, Vietnam',
 NOW() - INTERVAL '1 day', 'Infectious Bronchitis', 'Massachusetts', 'Low', 210, 8, 7000,
 NOW() - INTERVAL '1 day'),

('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Dong Nai Chicken Farm' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Poultry', 'Dong Nai, Vietnam',
 NOW() - INTERVAL '9 days', 'Infectious Bronchitis', 'Connecticut', 'Low', 165, 5, 5500,
 NOW() - INTERVAL '9 days'),

-- Additional cases for variety
('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Vinh Phuc Swine Farm' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Swine', 'Vinh Phuc, Vietnam',
 NOW() - INTERVAL '15 days', 'Swine Influenza', 'H1N1', 'Low', 42, 2, 550,
 NOW() - INTERVAL '15 days'),

('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Quang Nam Poultry Center' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Poultry', 'Quang Nam, Vietnam',
 NOW() - INTERVAL '5 days', 'Fowl Cholera', NULL, 'Medium', 95, 15, 4500,
 NOW() - INTERVAL '5 days'),

('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Hung Yen Swine Ranch' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Swine', 'Hung Yen, Vietnam',
 NOW() - INTERVAL '20 days', 'Classical Swine Fever', NULL, 'Medium', 38, 8, 650,
 NOW() - INTERVAL '20 days'),

('00711906-018c-4196-aa9a-ea636769d2a3',
 (SELECT id FROM farms WHERE name = 'Binh Duong Poultry Center' LIMIT 1),
 '31bd8156-d4d2-42da-a8f0-31fe452aa1bb', 'Poultry', 'Binh Duong, Vietnam',
 NOW() - INTERVAL '3 days', 'Infectious Coryza', NULL, 'Low', 125, 3, 6500,
 NOW() - INTERVAL '3 days');

-- ============================================
-- DONE! 
-- Refresh your dashboard to see:
-- - 20 farms with complete categorization
--   * 10 Swine farms (various types: GGP, GP, PS, Nursery, Fattening)
--   * 10 Poultry farms (Breeder/Commercial/Hatchery + Chicken types)
-- - GPS coordinates for all farms (visible on Maps)
-- - 15 disease reports linked to farms
-- - Animal type filters working
-- - Complete farm details in table
-- ============================================
