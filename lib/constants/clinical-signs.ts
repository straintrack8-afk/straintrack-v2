// Clinical signs by animal species

export const POULTRY_CLINICAL_SIGNS = [
    'Lethargy/Weakness',
    'Anorexia/Loss of appetite',
    'Edema (comb & wattle)',
    'Cyanosis (bluish comb)',
    'Hemorrhages (skin/muscle/organs)',
    'Torticollis/Head tilt',
    'Drop in egg production (>10%)',
    'Abnormal eggs (wrinkled, soft-shell)',
    'Diarrhea (white/green/bloody)',
    'Respiratory distress/Rales',
    'Facial swelling',
    'Sudden death',
] as const

export const SWINE_CLINICAL_SIGNS = [
    'Fever >40°C',
    'Anorexia',
    'Lethargy',
    'Coughing/Dyspnea/Tachypnea',
    'Abortion/Premature birth',
    'Cyanosis (ears/belly/extremities)',
    'Ataxia/Paralysis',
    'Diarrhea (may be bloody)',
    'Skin rash/Red lesions',
    'Sudden death (no symptoms)',
] as const

// Emergency actions
export const EMERGENCY_ACTIONS = [
    'Isolation of sick animals',
    'Area quarantine',
    'Disinfection of pens & equipment',
    'Reporting to Livestock Services',
    'Supportive treatment',
    'Emergency vaccination',
    'Selective euthanasia',
    'No action taken',
] as const
