// TypeScript type definitions for StrainTrack database schema

export interface User {
    id: string
    email: string
    full_name: string | null
    role: 'admin' | 'member' | 'super_admin'
    organization_id: string | null
    created_at: string
    updated_at: string
}

export interface Organization {
    id: string
    name: string
    description: string | null
    share_code: string
    address: string | null
    phone: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface UserOrganization {
    id: string
    user_id: string
    organization_id: string
    role: 'admin' | 'member'
    joined_at: string
}

export interface Farm {
    id: string
    organization_id: string
    name: string
    location: string | null
    latitude: number | null
    longitude: number | null
    animal_type: 'Swine' | 'Poultry' | null
    farm_type: string | null
    chicken_type: string | null
    created_at: string
    updated_at: string
}

export interface DiseaseReport {
    id: string
    organization_id: string
    farm_id: string | null
    created_by: string

    // Basic Info
    animal_species: string
    animal_category: string | null
    animal_subcategory: string | null
    outbreak_location: string | null
    total_population: number | null
    age_stage: string | null

    // Disease Info
    onset_date: string | null
    disease_name: string | null
    strain_subtype: string | null
    severity: 'Low' | 'Medium' | 'High' | 'Critical' | null
    pathology_findings: string | null

    // Clinical Presentation
    sick_count: number | null
    death_count: number | null
    morbidity_rate: number | null
    mortality_rate: number | null

    // Vaccination
    vaccination_history: string | null
    vaccine_name: string | null
    vaccination_date: string | null

    // Source & Response
    suspected_source: string | null

    // Lab Testing
    sample_sent: boolean
    sample_type: string | null
    lab_destination: string | null
    sample_ship_date: string | null

    // Documentation
    notes: string | null

    created_at: string
    updated_at: string
}

export interface ClinicalSign {
    id: string
    report_id: string
    sign_name: string
    created_at: string
}

export interface EmergencyAction {
    id: string
    report_id: string
    action_name: string
    created_at: string
}

export interface Attachment {
    id: string
    report_id: string
    file_name: string
    file_size: number | null
    file_type: string | null
    storage_path: string
    uploaded_by: string
    created_at: string
}

// Extended types with relations
export interface OrganizationWithRole extends Organization {
    role: 'admin' | 'member'
}

export interface DiseaseReportWithRelations extends DiseaseReport {
    farm?: Farm
    clinical_signs?: ClinicalSign[]
    emergency_actions?: EmergencyAction[]
    creator?: User
}

// RPC function return types
export interface CreateOrganizationResult {
    org_id: string
    org_share_code: string
}

export interface JoinOrganizationResult {
    success: boolean
    message: string
    org_id: string | null
}
