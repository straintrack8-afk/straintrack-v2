-- Dummy Data for Street Fighter Organization (lethanhngeu@gmail.com)
-- Step 1: Get organization_id and user_id

-- First, find the organization ID for "Street Fighter"
-- SELECT id FROM organizations WHERE name = 'Street Fighter';

-- Find user ID for lethanhngeu@gmail.com
-- SELECT id FROM users WHERE email = 'lethanhngeu@gmail.com';

-- Replace these with actual IDs from above queries
-- For now, using placeholders - MUST UPDATE AFTER RUNNING QUERIES

-- ============================================
-- STEP 1: Run these queries first to get IDs
-- ============================================

-- Get Street Fighter organization ID:
SELECT id, name FROM organizations WHERE name ILIKE '%Street%';

-- Get user ID:
SELECT id, email FROM users WHERE email = 'lethanhngeu@gmail.com';

-- ============================================
-- STEP 2: After getting IDs, update and run below
-- ============================================

-- IMPORTANT: Replace these variables with actual IDs from Step 1
DO $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_farm_id UUID;
    i INTEGER;
BEGIN
    -- Get organization ID
    SELECT id INTO v_org_id FROM organizations WHERE name ILIKE '%Street%' LIMIT 1;
    
    -- Get user ID
    SELECT id INTO v_user_id FROM users WHERE email = 'lethanhngeu@gmail.com';
    
    -- Check if IDs exist
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    RAISE NOTICE 'Organization ID: %', v_org_id;
    RAISE NOTICE 'User ID: %', v_user_id;
    
    -- ============================================
    -- CREATE 20 FARMS (10 Poultry + 10 Swine)
    -- ============================================
    
    FOR i IN 1..20 LOOP
        INSERT INTO farms (
            organization_id,
            name,
            location,
            latitude,
            longitude,
            animal_type,
            farm_type,
            chicken_type,
            created_at
        ) VALUES (
            v_org_id,
            'Street Fighter Farm ' || i,
            CASE 
                WHEN i <= 5 THEN 'Hanoi, Vietnam'
                WHEN i <= 10 THEN 'Ho Chi Minh City, Vietnam'
                WHEN i <= 15 THEN 'Da Nang, Vietnam'
                ELSE 'Can Tho, Vietnam'
            END,
            -- Random latitude around Vietnam (10-23 degrees)
            10 + (random() * 13),
            -- Random longitude around Vietnam (102-110 degrees)
            102 + (random() * 8),
            -- Only Poultry and Swine (no Cattle)
            CASE 
                WHEN i % 2 = 0 THEN 'Poultry'
                ELSE 'Swine'
            END,
            -- Farm type based on animal type
            CASE 
                WHEN i % 2 = 0 THEN  -- Poultry
                    CASE (i % 3)
                        WHEN 0 THEN 'Commercial Farm'
                        WHEN 1 THEN 'Breeder'
                        ELSE 'Hatchery'
                    END
                ELSE  -- Swine
                    CASE (i % 5)
                        WHEN 0 THEN 'Breeder - GGP'
                        WHEN 1 THEN 'Breeder - GP'
                        WHEN 2 THEN 'Breeder - PS'
                        WHEN 3 THEN 'Nursery'
                        ELSE 'Fattening'
                    END
            END,
            -- Chicken type only for Poultry
            CASE 
                WHEN i % 2 = 0 THEN  -- Poultry
                    CASE (i % 4)
                        WHEN 0 THEN 'Broiler'
                        WHEN 1 THEN 'Layer'
                        WHEN 2 THEN 'Duck'
                        ELSE 'Color Chicken'
                    END
                ELSE NULL  -- Swine
            END,
            NOW() - (i || ' days')::INTERVAL
        ) RETURNING id INTO v_farm_id;
        
        -- ============================================
        -- CREATE 1 DISEASE REPORT PER FARM (20 total)
        -- Only Poultry and Swine diseases
        -- ============================================
        
        INSERT INTO disease_reports (
            organization_id,
            farm_id,
            created_by,
            animal_species,
            outbreak_location,
            onset_date,
            disease_name,
            strain_subtype,
            severity,
            sick_count,
            death_count,
            total_population,
            created_at
        ) VALUES (
            v_org_id,
            v_farm_id,
            v_user_id,
            -- Only Poultry and Swine
            CASE 
                WHEN i % 2 = 0 THEN 'Poultry'
                ELSE 'Swine'
            END,
            CASE 
                WHEN i <= 5 THEN 'Hanoi, Vietnam'
                WHEN i <= 10 THEN 'Ho Chi Minh City, Vietnam'
                WHEN i <= 15 THEN 'Da Nang, Vietnam'
                ELSE 'Can Tho, Vietnam'
            END,
            NOW() - (i || ' days')::INTERVAL,
            -- Disease name based on animal type
            CASE 
                WHEN i % 2 = 0 THEN  -- Poultry diseases
                    CASE (i % 5)
                        WHEN 0 THEN 'Avian Influenza'
                        WHEN 1 THEN 'Newcastle Disease'
                        WHEN 2 THEN 'Infectious Bronchitis'
                        WHEN 3 THEN 'Fowl Pox'
                        ELSE 'Salmonellosis'
                    END
                ELSE  -- Swine diseases
                    CASE (i % 5)
                        WHEN 0 THEN 'African Swine Fever'
                        WHEN 1 THEN 'PRRS'
                        WHEN 2 THEN 'Swine Influenza'
                        WHEN 3 THEN 'Foot and Mouth Disease'
                        ELSE 'Classical Swine Fever'
                    END
            END,
            -- Strain subtype
            CASE (i % 6)
                WHEN 0 THEN 'H5N1'
                WHEN 1 THEN 'Genotype II'
                WHEN 2 THEN 'Type O'
                WHEN 3 THEN 'Strain A'
                WHEN 4 THEN 'Variant B'
                ELSE 'Unknown'
            END,
            CASE (i % 4)
                WHEN 0 THEN 'Critical'
                WHEN 1 THEN 'High'
                WHEN 2 THEN 'Medium'
                ELSE 'Low'
            END,
            10 + (i * 3),  -- sick_count
            CASE 
                WHEN i % 4 = 0 THEN i  -- Critical: more deaths
                WHEN i % 4 = 1 THEN i / 2  -- High: some deaths
                ELSE 0  -- Medium/Low: no deaths
            END,
            150 + (i * 75),  -- total_population
            NOW() - (i || ' days')::INTERVAL
        );
        
        RAISE NOTICE 'Created farm % and disease report %', i, i;
    END LOOP;
    
    RAISE NOTICE 'Successfully created 20 farms and 20 disease reports for Street Fighter organization';
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check farms created
SELECT COUNT(*) as farm_count, organization_id 
FROM farms 
WHERE organization_id IN (SELECT id FROM organizations WHERE name ILIKE '%Street%')
GROUP BY organization_id;

-- Check disease reports created
SELECT COUNT(*) as report_count, organization_id 
FROM disease_reports 
WHERE organization_id IN (SELECT id FROM organizations WHERE name ILIKE '%Street%')
GROUP BY organization_id;

-- View sample data
SELECT f.name as farm_name, dr.disease_name, dr.severity, dr.sick_count, dr.death_count
FROM disease_reports dr
JOIN farms f ON dr.farm_id = f.id
WHERE dr.organization_id IN (SELECT id FROM organizations WHERE name ILIKE '%Street%')
ORDER BY dr.created_at DESC
LIMIT 10;
