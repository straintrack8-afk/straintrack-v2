-- DELETE DUPLICATE DATA FOR STREET FIGHTER ORGANIZATION
-- Run this script to clean up duplicate farms and disease reports

-- ============================================
-- STEP 1: Find Street Fighter organization ID
-- ============================================

-- Check current data count
SELECT 
    o.name as organization_name,
    COUNT(DISTINCT f.id) as farm_count,
    COUNT(DISTINCT dr.id) as report_count
FROM organizations o
LEFT JOIN farms f ON f.organization_id = o.id
LEFT JOIN disease_reports dr ON dr.organization_id = o.id
WHERE o.name ILIKE '%Street%'
GROUP BY o.id, o.name;

-- ============================================
-- STEP 2: Delete ALL Street Fighter data
-- (Run this to start fresh)
-- ============================================

-- Delete disease reports first (foreign key constraint)
DELETE FROM disease_reports 
WHERE organization_id IN (
    SELECT id FROM organizations WHERE name ILIKE '%Street%'
);

-- Delete farms
DELETE FROM farms 
WHERE organization_id IN (
    SELECT id FROM organizations WHERE name ILIKE '%Street%'
);

-- ============================================
-- STEP 3: Verify deletion
-- ============================================

SELECT 
    o.name as organization_name,
    COUNT(DISTINCT f.id) as farm_count,
    COUNT(DISTINCT dr.id) as report_count
FROM organizations o
LEFT JOIN farms f ON f.organization_id = o.id
LEFT JOIN disease_reports dr ON dr.organization_id = o.id
WHERE o.name ILIKE '%Street%'
GROUP BY o.id, o.name;

-- Should show 0 farms and 0 reports

-- ============================================
-- STEP 4: Now run STREET-FIGHTER-DUMMY-DATA.sql
-- to create fresh data (Poultry + Swine only)
-- ============================================
