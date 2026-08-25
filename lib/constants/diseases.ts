// Disease lists and strain mappings for disease report form

export const POULTRY_DISEASES = [
    { value: 'Avian Influenza (AI)', label: 'Avian Influenza (AI)' },
    { value: 'Newcastle Disease (ND)', label: 'Newcastle Disease (ND)' },
    { value: 'Infectious Bronchitis (IB)', label: 'Infectious Bronchitis (IB)' },
    { value: 'Infectious Bursal Disease (IBD/Gumboro)', label: 'Infectious Bursal Disease (IBD/Gumboro)' },
    { value: 'Marek\'s Disease', label: 'Marek\'s Disease' },
    { value: 'Fowl Pox', label: 'Fowl Pox' },
    { value: 'Infectious Coryza', label: 'Infectious Coryza' },
    { value: 'Colibacillosis (E. coli)', label: 'Colibacillosis (E. coli)' },
    { value: 'Salmonellosis', label: 'Salmonellosis' },
    { value: 'Mycoplasmosis (CRD/MS/MG)', label: 'Mycoplasmosis (CRD/MS/MG)' },
    { value: 'Coccidiosis', label: 'Coccidiosis' },
    { value: 'Necrotic Enteritis', label: 'Necrotic Enteritis' },
    { value: 'Fowl Cholera', label: 'Fowl Cholera' },
    { value: 'Avian Encephalomyelitis (AE)', label: 'Avian Encephalomyelitis (AE)' },
    { value: 'Other', label: 'Other (specify)' },
] as const

export const SWINE_DISEASES = [
    { value: 'African Swine Fever (ASF)', label: 'African Swine Fever (ASF)' },
    { value: 'Classical Swine Fever (CSF)', label: 'Classical Swine Fever (CSF/Hog Cholera)' },
    { value: 'PRRS', label: 'Porcine Reproductive & Respiratory Syndrome (PRRS)' },
    { value: 'Porcine Epidemic Diarrhea (PED)', label: 'Porcine Epidemic Diarrhea (PED)' },
    { value: 'Foot-and-Mouth Disease (FMD)', label: 'Foot-and-Mouth Disease (FMD)' },
    { value: 'Swine Influenza (SIV)', label: 'Swine Influenza (SIV)' },
    { value: 'Porcine Circovirus (PCV2)', label: 'Porcine Circovirus (PCV2/PCVAD)' },
    { value: 'Actinobacillus pleuropneumoniae', label: 'Actinobacillus pleuropneumoniae (APP)' },
    { value: 'Mycoplasma hyopneumoniae', label: 'Mycoplasma hyopneumoniae' },
    { value: 'Streptococcus suis', label: 'Streptococcus suis' },
    { value: 'Salmonellosis', label: 'Salmonellosis' },
    { value: 'Colibacillosis', label: 'Colibacillosis' },
    { value: 'Erysipelas', label: 'Erysipelas' },
    { value: 'Atrophic Rhinitis', label: 'Atrophic Rhinitis' },
    { value: 'Other', label: 'Other (specify)' },
] as const

// Strain/subtype mappings by disease
export const DISEASE_STRAINS: Record<string, string[]> = {
    'Avian Influenza (AI)': ['H5N1', 'H5N6', 'H5N8', 'H7N9', 'H9N2', 'Other'],
    'Newcastle Disease (ND)': ['Velogenic', 'Mesogenic', 'Lentogenic', 'Other'],
    'Infectious Bronchitis (IB)': ['Mass', '4/91', 'QX-like', 'TW-I', 'Korea KM91', 'Other'],
    'PRRS': ['Type 1 (European)', 'Type 2 (NA)', 'HP-PRRSV', 'NADC30-like', 'NADC34-like', 'Other'],
    'Swine Influenza (SIV)': ['H1N1', 'H1N2', 'H3N2', 'Other'],
    'Foot-and-Mouth Disease (FMD)': ['Type O', 'Type A', 'Type Asia 1', 'Type SAT', 'Other'],
}

// WOAH-listed diseases that require notification
export const WOAH_LISTED_DISEASES = [
    'Avian Influenza (AI)',
    'Newcastle Disease (ND)',
    'African Swine Fever (ASF)',
    'Classical Swine Fever (CSF)',
    'Foot-and-Mouth Disease (FMD)',
]

// Animal categories
export const POULTRY_CATEGORIES = [
    { value: 'Broiler', label: 'Broiler', hasSubcategory: false },
    { value: 'Layer', label: 'Layer', hasSubcategory: false },
    { value: 'Breeder', label: 'Breeder', hasSubcategory: true },
    { value: 'Duck', label: 'Duck', hasSubcategory: false },
    { value: 'Native/Local Breed', label: 'Native/Local Breed', hasSubcategory: false },
] as const

export const SWINE_CATEGORIES = [
    { value: 'Breeder', label: 'Breeder', hasSubcategory: true },
    { value: 'Commercial', label: 'Commercial', hasSubcategory: true },
] as const

// Subcategories
export const POULTRY_BREEDER_SUBCATEGORIES = ['GP (Grand Parent)', 'PS (Parent Stock)']
export const SWINE_BREEDER_SUBCATEGORIES = ['GGP (Great Grand Parent)', 'GP (Grand Parent)', 'PS (Parent Stock)']
export const SWINE_COMMERCIAL_SUBCATEGORIES = ['Nursery', 'Fattening', 'Finishing']

// Age stages for poultry
export const POULTRY_COMMERCIAL_AGE_STAGES = [
    ...Array.from({ length: 80 }, (_, i) => `Week ${i + 1}`),
    'Week 80+',
]

export const POULTRY_BREEDER_AGE_STAGES = [
    'Pullet (1-20 weeks)',
    'Production (21-65 weeks)',
]

// Age stages for swine
export const SWINE_COMMERCIAL_AGE_STAGES = [
    ...Array.from({ length: 24 }, (_, i) => `Week ${i + 1}`),
    'Week 24+',
]

export const SWINE_BREEDER_AGE_STAGES = [
    'Quarantine',
    'Gestation',
    'Lactating',
    'Weaning',
    'Gilt Development',
    'Boar',
]

// Suspected sources
export const SUSPECTED_SOURCES = [
    'New livestock (introduction)',
    'Feed',
    'Water',
    'Vectors (mosquitoes, flies, rodents)',
    'Workers/Visitors',
    'Equipment/Tools',
    'Vehicles',
    'Wild animals (birds, wild boars)',
    'Unknown',
] as const

// Sample types
export const SAMPLE_TYPES = [
    'Blood',
    'Tracheal/Cloacal swab',
    'Organs (spleen/liver/kidney)',
    'Feces',
    'Lung tissue',
    'Other',
] as const

// Severity levels
export const SEVERITY_LEVELS = [
    { value: 'Low', label: 'Low (morbidity <10%)', description: 'Mild symptoms, low morbidity' },
    { value: 'Medium', label: 'Medium (morbidity 10-30%)', description: 'Moderate symptoms, no high mortality' },
    { value: 'High', label: 'High (morbidity >30%, mortality >5%)', description: 'Severe symptoms, significant mortality' },
    { value: 'Critical', label: 'Critical (mortality >20%)', description: 'Very high mortality, biosecurity threat' },
] as const
