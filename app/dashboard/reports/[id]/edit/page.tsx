'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
    POULTRY_DISEASES, SWINE_DISEASES, DISEASE_STRAINS,
    POULTRY_CATEGORIES, SWINE_CATEGORIES,
    POULTRY_BREEDER_SUBCATEGORIES, SWINE_BREEDER_SUBCATEGORIES, SWINE_COMMERCIAL_SUBCATEGORIES,
    POULTRY_COMMERCIAL_AGE_STAGES, POULTRY_BREEDER_AGE_STAGES,
    SWINE_COMMERCIAL_AGE_STAGES, SWINE_BREEDER_AGE_STAGES,
    SUSPECTED_SOURCES, SAMPLE_TYPES, SEVERITY_LEVELS,
} from '@/lib/constants/diseases'
import { POULTRY_CLINICAL_SIGNS, SWINE_CLINICAL_SIGNS, EMERGENCY_ACTIONS } from '@/lib/constants/clinical-signs'
import { SWINE_BREEDER_LOCATIONS, SWINE_COMMERCIAL_LOCATIONS } from '@/lib/constants/outbreak-locations'

export default function EditDiseaseReportPage() {
    const router = useRouter()
    const params = useParams()
    const reportId = params.id as string
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [farms, setFarms] = useState<any[]>([])

    const [formData, setFormData] = useState({
        farm_id: '', animal_species: 'Poultry', animal_category: '', animal_subcategory: '',
        outbreak_location: '', outbreak_location_other: '', total_population: '', age_stage: '',
        onset_date: '', disease_name: '', disease_name_other: '', strain_subtype: '', strain_subtype_other: '',
        severity: 'Medium', pathology_findings: '', sick_count: '', death_count: '',
        vaccination_history: '', vaccine_name: '', vaccination_date: '',
        suspected_source: '', sample_sent: false, sample_type: '', lab_destination: '', sample_ship_date: '', notes: '',
    })

    const [clinicalSigns, setClinicalSigns] = useState<string[]>([])
    const [clinicalSignsOther, setClinicalSignsOther] = useState('')
    const [emergencyActions, setEmergencyActions] = useState<string[]>([])

    useEffect(() => {
        loadFarms()
        loadReport()
    }, [])

    const loadFarms = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data: userData } = await supabase.from('users').select('organization_id').eq('id', session.user.id).single()
        if (!userData?.organization_id) return
        const { data: farmsData } = await supabase.from('farms').select('*').eq('organization_id', userData.organization_id).order('name')
        if (farmsData) setFarms(farmsData)
    }

    const loadReport = async () => {
        try {
            const { data: report, error } = await supabase
                .from('disease_reports')
                .select('*')
                .eq('id', reportId)
                .single()

            if (error) throw error
            if (!report) throw new Error('Report not found')

            // Load clinical signs
            const { data: signs } = await supabase
                .from('clinical_signs')
                .select('sign_name')
                .eq('report_id', reportId)

            // Load emergency actions
            const { data: actions } = await supabase
                .from('emergency_actions')
                .select('action_name')
                .eq('report_id', reportId)

            // Pre-fill form data
            setFormData({
                farm_id: report.farm_id || '',
                animal_species: report.animal_species || 'Poultry',
                animal_category: report.animal_category || '',
                animal_subcategory: report.animal_subcategory || '',
                outbreak_location: report.outbreak_location || '',
                outbreak_location_other: '',
                total_population: report.total_population?.toString() || '',
                age_stage: report.age_stage || '',
                onset_date: report.onset_date || '',
                disease_name: report.disease_name || '',
                disease_name_other: '',
                strain_subtype: report.strain_subtype || '',
                strain_subtype_other: '',
                severity: report.severity || 'Medium',
                pathology_findings: report.pathology_findings || '',
                sick_count: report.sick_count?.toString() || '',
                death_count: report.death_count?.toString() || '',
                vaccination_history: report.vaccination_history || '',
                vaccine_name: report.vaccine_name || '',
                vaccination_date: report.vaccination_date || '',
                suspected_source: report.suspected_source || '',
                sample_sent: report.sample_sent || false,
                sample_type: report.sample_type || '',
                lab_destination: report.lab_destination || '',
                sample_ship_date: report.sample_ship_date || '',
                notes: report.notes || '',
            })

            // Set clinical signs
            if (signs && signs.length > 0) {
                const regularSigns = signs.filter(s => !s.sign_name.startsWith('Other:')).map(s => s.sign_name)
                const otherSign = signs.find(s => s.sign_name.startsWith('Other:'))
                setClinicalSigns(regularSigns)
                if (otherSign) {
                    setClinicalSignsOther(otherSign.sign_name.replace('Other: ', ''))
                }
            }

            // Set emergency actions
            if (actions && actions.length > 0) {
                setEmergencyActions(actions.map(a => a.action_name))
            }

            setLoading(false)
        } catch (err: any) {
            console.error('Error loading report:', err)
            alert(err.message || 'Failed to load report')
            router.push('/dashboard/reports')
        }
    }

    const diseaseOptions = formData.animal_species === 'Poultry' ? POULTRY_DISEASES : SWINE_DISEASES
    const categoryOptions = formData.animal_species === 'Poultry' ? POULTRY_CATEGORIES : SWINE_CATEGORIES
    const clinicalSignsOptions = formData.animal_species === 'Poultry' ? POULTRY_CLINICAL_SIGNS : SWINE_CLINICAL_SIGNS
    const currentCategory = categoryOptions.find(c => c.value === formData.animal_category)
    const showSubcategory = currentCategory?.hasSubcategory || false

    const subcategoryOptions = useMemo(() => {
        if (formData.animal_species === 'Poultry' && formData.animal_category === 'Breeder') return POULTRY_BREEDER_SUBCATEGORIES
        if (formData.animal_species === 'Swine') {
            if (formData.animal_category === 'Breeder') return SWINE_BREEDER_SUBCATEGORIES
            if (formData.animal_category === 'Commercial') return SWINE_COMMERCIAL_SUBCATEGORIES
        }
        return []
    }, [formData.animal_species, formData.animal_category])

    const showOutbreakLocation = formData.animal_species === 'Swine'
    const outbreakLocationOptions = useMemo(() => {
        if (formData.animal_species === 'Swine') {
            if (formData.animal_category === 'Breeder') return SWINE_BREEDER_LOCATIONS
            if (formData.animal_category === 'Commercial') return SWINE_COMMERCIAL_LOCATIONS
        }
        return []
    }, [formData.animal_species, formData.animal_category])

    const ageStageOptions = useMemo(() => {
        if (formData.animal_species === 'Poultry') {
            if (formData.animal_category === 'Breeder') return POULTRY_BREEDER_AGE_STAGES
            return POULTRY_COMMERCIAL_AGE_STAGES
        }
        if (formData.animal_species === 'Swine') {
            if (formData.animal_category === 'Breeder') return SWINE_BREEDER_AGE_STAGES
            return SWINE_COMMERCIAL_AGE_STAGES
        }
        return []
    }, [formData.animal_species, formData.animal_category])

    const strainOptions = DISEASE_STRAINS[formData.disease_name] || []

    const morbidityRate = useMemo(() => {
        if (formData.total_population && formData.sick_count) {
            return ((parseInt(formData.sick_count) / parseInt(formData.total_population)) * 100).toFixed(2)
        }
        return '0.00'
    }, [formData.total_population, formData.sick_count])

    const mortalityRate = useMemo(() => {
        if (formData.total_population && formData.death_count) {
            return ((parseInt(formData.death_count) / parseInt(formData.total_population)) * 100).toFixed(2)
        }
        return '0.00'
    }, [formData.total_population, formData.death_count])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const finalDiseaseName = formData.disease_name === 'Other' ? formData.disease_name_other : formData.disease_name
            const finalStrain = formData.strain_subtype === 'Other' ? formData.strain_subtype_other : formData.strain_subtype
            const finalOutbreakLocation = formData.outbreak_location === 'Other' ? formData.outbreak_location_other : formData.outbreak_location

            // Update the report
            const { error: reportError } = await supabase.from('disease_reports').update({
                farm_id: formData.farm_id, animal_species: formData.animal_species,
                animal_category: formData.animal_category, animal_subcategory: formData.animal_subcategory || null,
                outbreak_location: finalOutbreakLocation || null, total_population: parseInt(formData.total_population) || null,
                age_stage: formData.age_stage || null, onset_date: formData.onset_date,
                disease_name: finalDiseaseName, strain_subtype: finalStrain || null, severity: formData.severity,
                pathology_findings: formData.pathology_findings || null, sick_count: parseInt(formData.sick_count) || null,
                death_count: parseInt(formData.death_count) || null, morbidity_rate: parseFloat(morbidityRate),
                mortality_rate: parseFloat(mortalityRate), vaccination_history: formData.vaccination_history || null,
                vaccine_name: formData.vaccine_name || null, vaccination_date: formData.vaccination_date || null,
                suspected_source: formData.suspected_source || null, sample_sent: formData.sample_sent,
                sample_type: formData.sample_type || null, lab_destination: formData.lab_destination || null,
                sample_ship_date: formData.sample_ship_date || null, notes: formData.notes || null,
            }).eq('id', reportId)

            if (reportError) throw reportError

            // Delete existing clinical signs and actions
            await supabase.from('clinical_signs').delete().eq('report_id', reportId)
            await supabase.from('emergency_actions').delete().eq('report_id', reportId)

            // Insert new clinical signs and actions
            const allClinicalSigns = [...clinicalSigns]
            if (clinicalSignsOther) allClinicalSigns.push(`Other: ${clinicalSignsOther}`)
            if (allClinicalSigns.length > 0) {
                await supabase.from('clinical_signs').insert(allClinicalSigns.map(sign => ({ report_id: reportId, sign_name: sign })))
            }
            if (emergencyActions.length > 0) {
                await supabase.from('emergency_actions').insert(emergencyActions.map(action => ({ report_id: reportId, action_name: action })))
            }

            router.push('/dashboard/reports')
        } catch (err: any) {
            console.error('Error:', err)
            alert(err.message || 'Failed to update report')
        } finally {
            setLoading(false)
        }
    }

    const toggleClinicalSign = (sign: string) => {
        setClinicalSigns(prev => prev.includes(sign) ? prev.filter(s => s !== sign) : [...prev, sign])
    }

    const toggleEmergencyAction = (action: string) => {
        setEmergencyActions(prev => prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action])
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <Link href="/dashboard/reports" className="inline-flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Reports
            </Link>

            <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Disease Report</h1>
                <p className="text-gray-600 mt-1">Update comprehensive farm-level disease surveillance (22 fields)</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Farm */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="font-semibold mb-3">1. Farm Selection</h3>
                    <select required value={formData.farm_id} onChange={(e) => setFormData({ ...formData, farm_id: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500">
                        <option value="">Select farm *</option>
                        {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>

                {/* 2-3. Species & Category */}
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <h3 className="font-semibold">2-3. Animal Information</h3>
                    <div>
                        <label className="block text-sm font-medium mb-2">Animal Species *</label>
                        <div className="flex gap-4">
                            {['Poultry', 'Swine'].map(species => (
                                <label key={species} className="flex items-center cursor-pointer">
                                    <input type="radio" value={species} checked={formData.animal_species === species}
                                        onChange={(e) => setFormData({ ...formData, animal_species: e.target.value, animal_category: '', animal_subcategory: '', outbreak_location: '' })}
                                        className="mr-2" />
                                    <span>{species === 'Poultry' ? '🐔' : '🐖'} {species}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Category *</label>
                        <select required value={formData.animal_category} onChange={(e) => setFormData({ ...formData, animal_category: e.target.value, animal_subcategory: '' })}
                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500">
                            <option value="">Select category</option>
                            {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    {showSubcategory && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Subcategory *</label>
                            <select required value={formData.animal_subcategory} onChange={(e) => setFormData({ ...formData, animal_subcategory: e.target.value })}
                                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500">
                                <option value="">Select subcategory</option>
                                {subcategoryOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* 4. Outbreak Location (Swine only) */}
                {showOutbreakLocation && outbreakLocationOptions.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="font-semibold mb-3">4. Outbreak Location (Swine)</h3>
                        <select value={formData.outbreak_location} onChange={(e) => setFormData({ ...formData, outbreak_location: e.target.value })}
                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500">
                            <option value="">Select location</option>
                            {outbreakLocationOptions.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        {formData.outbreak_location === 'Other' && (
                            <input type="text" value={formData.outbreak_location_other} onChange={(e) => setFormData({ ...formData, outbreak_location_other: e.target.value })}
                                placeholder="Specify location" className="w-full px-4 py-3 border rounded-lg mt-2" />
                        )}
                    </div>
                )}

                {/* 5-6. Population & Age */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="font-semibold mb-3">5-6. Population & Age</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Total Population *</label>
                            <input type="number" required min="1" value={formData.total_population} onChange={(e) => setFormData({ ...formData, total_population: e.target.value })}
                                className="w-full px-4 py-3 border rounded-lg" placeholder="Total animals" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Age/Stage</label>
                            <select value={formData.age_stage} onChange={(e) => setFormData({ ...formData, age_stage: e.target.value })}
                                className="w-full px-4 py-3 border rounded-lg">
                                <option value="">Select age/stage</option>
                                {ageStageOptions.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 7-10. Disease Info */}
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <h3 className="font-semibold">7-10. Disease Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Onset Date *</label>
                            <input type="date" required value={formData.onset_date} onChange={(e) => setFormData({ ...formData, onset_date: e.target.value })}
                                className="w-full px-4 py-3 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Disease Name *</label>
                            <select required value={formData.disease_name} onChange={(e) => setFormData({ ...formData, disease_name: e.target.value, strain_subtype: '' })}
                                className="w-full px-4 py-3 border rounded-lg">
                                <option value="">Select disease</option>
                                {diseaseOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                        </div>
                    </div>
                    {formData.disease_name === 'Other' && (
                        <input type="text" required value={formData.disease_name_other} onChange={(e) => setFormData({ ...formData, disease_name_other: e.target.value })}
                            placeholder="Specify disease name" className="w-full px-4 py-3 border rounded-lg" />
                    )}
                    {strainOptions.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Strain/Subtype</label>
                            <input
                                type="text"
                                list="strain-options-edit"
                                value={formData.strain_subtype}
                                onChange={(e) => setFormData({ ...formData, strain_subtype: e.target.value })}
                                placeholder="Select or type strain/subtype"
                                className="w-full px-4 py-3 border rounded-lg"
                            />
                            <datalist id="strain-options-edit">
                                {strainOptions.map(s => <option key={s} value={s} />)}
                            </datalist>
                            <p className="text-xs text-gray-500 mt-1">Select from dropdown or type custom strain</p>
                        </div>
                    )}
                    {formData.strain_subtype === 'Other' && (
                        <input type="text" value={formData.strain_subtype_other} onChange={(e) => setFormData({ ...formData, strain_subtype_other: e.target.value })}
                            placeholder="Specify strain" className="w-full px-4 py-3 border rounded-lg" />
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-2">Severity *</label>
                        <div className="space-y-2">
                            {SEVERITY_LEVELS.map(s => (
                                <label key={s.value} className="flex items-start cursor-pointer">
                                    <input type="radio" value={s.value} checked={formData.severity === s.value}
                                        onChange={(e) => setFormData({ ...formData, severity: e.target.value })} className="mt-1 mr-2" />
                                    <div><span className="font-medium">{s.label}</span><p className="text-sm text-gray-600">{s.description}</p></div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 11-15. Clinical Presentation */}
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <h3 className="font-semibold">11-15. Clinical Presentation</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Sick Count *</label>
                            <input type="number" required min="0" value={formData.sick_count} onChange={(e) => setFormData({ ...formData, sick_count: e.target.value })}
                                className="w-full px-4 py-3 border rounded-lg" />
                            <p className="text-sm text-gray-600 mt-1">Morbidity Rate: {morbidityRate}%</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Death Count *</label>
                            <input type="number" required min="0" value={formData.death_count} onChange={(e) => setFormData({ ...formData, death_count: e.target.value })}
                                className="w-full px-4 py-3 border rounded-lg" />
                            <p className="text-sm text-gray-600 mt-1">Mortality Rate: {mortalityRate}%</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Clinical Signs</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {clinicalSignsOptions.map(sign => (
                                <label key={sign} className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={clinicalSigns.includes(sign)} onChange={() => toggleClinicalSign(sign)}
                                        className="rounded mr-2" />
                                    <span className="text-sm">{sign}</span>
                                </label>
                            ))}
                        </div>
                        <input type="text" value={clinicalSignsOther} onChange={(e) => setClinicalSignsOther(e.target.value)}
                            placeholder="Other symptoms (specify)" className="w-full px-4 py-2 border rounded-lg mt-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Pathology Findings</label>
                        <textarea value={formData.pathology_findings} onChange={(e) => setFormData({ ...formData, pathology_findings: e.target.value })}
                            rows={3} className="w-full px-4 py-2 border rounded-lg" placeholder="Describe pathological findings..." />
                    </div>
                </div>

                {/* 16. Vaccination */}
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <h3 className="font-semibold">16. Vaccination History</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Vaccination Status</label>
                            <select value={formData.vaccination_history} onChange={(e) => setFormData({ ...formData, vaccination_history: e.target.value })}
                                className="w-full px-4 py-3 border rounded-lg">
                                <option value="">Select status</option>
                                <option value="Yes">Yes - Vaccinated</option>
                                <option value="No">No - Not Vaccinated</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </div>
                        {formData.vaccination_history === 'Yes' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Vaccine Name</label>
                                    <input type="text" value={formData.vaccine_name} onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-lg" placeholder="e.g., ND+IB LaSota" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Vaccination Date</label>
                                    <input type="date" value={formData.vaccination_date} onChange={(e) => setFormData({ ...formData, vaccination_date: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-lg" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 17-18. Source & Actions */}
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <h3 className="font-semibold">17-18. Suspected Source & Emergency Actions</h3>
                    <div>
                        <label className="block text-sm font-medium mb-2">Suspected Source</label>
                        <select value={formData.suspected_source} onChange={(e) => setFormData({ ...formData, suspected_source: e.target.value })}
                            className="w-full px-4 py-3 border rounded-lg">
                            <option value="">Select source</option>
                            {SUSPECTED_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Emergency Actions Taken</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {EMERGENCY_ACTIONS.map(action => (
                                <label key={action} className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={emergencyActions.includes(action)} onChange={() => toggleEmergencyAction(action)}
                                        className="rounded mr-2" />
                                    <span className="text-sm">{action}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 19. Lab Testing */}
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <h3 className="font-semibold">19. Laboratory Testing</h3>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={formData.sample_sent} onChange={(e) => setFormData({ ...formData, sample_sent: e.target.checked })}
                            className="rounded mr-2" />
                        <span className="font-medium">Sample sent for testing</span>
                    </label>
                    {formData.sample_sent && (
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Sample Type</label>
                                <select value={formData.sample_type} onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })}
                                    className="w-full px-4 py-3 border rounded-lg">
                                    <option value="">Select type</option>
                                    {SAMPLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Lab Destination</label>
                                <input type="text" value={formData.lab_destination} onChange={(e) => setFormData({ ...formData, lab_destination: e.target.value })}
                                    className="w-full px-4 py-3 border rounded-lg" placeholder="Laboratory name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Ship Date</label>
                                <input type="date" value={formData.sample_ship_date} onChange={(e) => setFormData({ ...formData, sample_ship_date: e.target.value })}
                                    className="w-full px-4 py-3 border rounded-lg" />
                            </div>
                        </div>
                    )}
                </div>

                {/* 21. Notes */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="font-semibold mb-3">21. Additional Notes</h3>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={4} className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Additional notes: previous disease history, spread pattern, unique observations, etc." />
                </div>

                {/* 22. Submit */}
                <div className="flex justify-end gap-4">
                    <Link href="/dashboard/reports" className="px-6 py-3 border rounded-lg hover:bg-gray-50">Cancel</Link>
                    <button type="submit" disabled={loading} className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                        {loading ? 'Updating Report...' : 'Update Report'}
                    </button>
                </div>
            </form>
        </div>
    )
}
