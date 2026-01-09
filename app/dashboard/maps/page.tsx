'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Filter } from 'lucide-react'
import { useOrganization } from '@/contexts/OrganizationContext'

// Dynamically import FarmMap to avoid SSR issues with Leaflet
const FarmMap = dynamic(() => import('./components/FarmMap').then(mod => ({ default: mod.default })), {
    ssr: false,
    loading: () => (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-primary-600 animate-pulse" />
                <p className="text-gray-600">Loading map...</p>
            </div>
        </div>
    )
})

export default function MapsPage() {
    const supabase = createClient()
    const { activeOrg } = useOrganization()
    const [farms, setFarms] = useState<any[]>([])
    const [reports, setReports] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Filter states
    const [animalFilter, setAnimalFilter] = useState<string>('all')
    const [farmTypeFilter, setFarmTypeFilter] = useState<string>('all')
    const [diseaseFilter, setDiseaseFilter] = useState<string>('all')
    const [strainFilter, setStrainFilter] = useState<string>('all')

    useEffect(() => {
        loadData()
    }, [activeOrg])

    const loadData = async () => {
        if (!activeOrg?.id) {
            setLoading(false)
            return
        }

        setLoading(true)

        // Check if this is Super Admin Organization (Global View)
        const isGlobalView = activeOrg.name === 'Super Admin Organization'

        // Load farms with GPS coordinates
        let farmsQuery = supabase
            .from('farms')
            .select('*, organizations(name)')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)

        if (!isGlobalView) {
            farmsQuery = farmsQuery.eq('organization_id', activeOrg.id)
        }

        const { data: farmsData } = await farmsQuery

        // Load disease reports
        let reportsQuery = supabase
            .from('disease_reports')
            .select('*')

        if (!isGlobalView) {
            reportsQuery = reportsQuery.eq('organization_id', activeOrg.id)
        }

        const { data: reportsData } = await reportsQuery

        setFarms(farmsData || [])
        setReports(reportsData || [])
        setLoading(false)
    }

    // Get unique values for filters - cascading based on animal type
    const animalTypes = useMemo(() => {
        const types = new Set(farms.map(f => f.animal_type).filter(Boolean))
        return Array.from(types).sort()
    }, [farms])

    const farmTypes = useMemo(() => {
        let filteredFarms = farms
        if (animalFilter !== 'all') {
            filteredFarms = filteredFarms.filter(f => f.animal_type === animalFilter)
        }
        const types = new Set(filteredFarms.map(f => f.farm_type).filter(Boolean))
        return Array.from(types).sort()
    }, [farms, animalFilter])

    const diseases = useMemo(() => {
        let filteredReports = reports

        // Filter reports by animal type
        if (animalFilter !== 'all') {
            const farmIds = new Set(farms.filter(f => f.animal_type === animalFilter).map(f => f.id))
            filteredReports = filteredReports.filter(r => farmIds.has(r.farm_id))
        }

        // Filter reports by farm type
        if (farmTypeFilter !== 'all') {
            const farmIds = new Set(farms.filter(f => f.farm_type === farmTypeFilter).map(f => f.id))
            filteredReports = filteredReports.filter(r => farmIds.has(r.farm_id))
        }

        const diseaseSet = new Set(filteredReports.map(r => r.disease_name).filter(Boolean))
        return Array.from(diseaseSet).sort()
    }, [reports, farms, animalFilter, farmTypeFilter])

    const strains = useMemo(() => {
        let filteredReports = reports

        // Filter reports by animal type
        if (animalFilter !== 'all') {
            const farmIds = new Set(farms.filter(f => f.animal_type === animalFilter).map(f => f.id))
            filteredReports = filteredReports.filter(r => farmIds.has(r.farm_id))
        }

        // Filter reports by farm type
        if (farmTypeFilter !== 'all') {
            const farmIds = new Set(farms.filter(f => f.farm_type === farmTypeFilter).map(f => f.id))
            filteredReports = filteredReports.filter(r => farmIds.has(r.farm_id))
        }

        // Filter reports by disease
        if (diseaseFilter !== 'all') {
            filteredReports = filteredReports.filter(r => r.disease_name === diseaseFilter)
        }

        const strainSet = new Set(filteredReports.map(r => r.strain_subtype).filter(Boolean))
        return Array.from(strainSet).sort()
    }, [reports, farms, animalFilter, farmTypeFilter, diseaseFilter])

    // Reset dependent filters when parent filter changes
    useEffect(() => {
        // Reset farm type, disease, and strain when animal type changes
        setFarmTypeFilter('all')
        setDiseaseFilter('all')
        setStrainFilter('all')
    }, [animalFilter])

    useEffect(() => {
        // Reset disease and strain when farm type changes
        setDiseaseFilter('all')
        setStrainFilter('all')
    }, [farmTypeFilter])

    useEffect(() => {
        // Reset strain when disease changes
        setStrainFilter('all')
    }, [diseaseFilter])

    // Filtered farm markers
    const filteredFarmMarkers = useMemo(() => {
        let filteredFarms = farms

        // Filter by animal type
        if (animalFilter !== 'all') {
            filteredFarms = filteredFarms.filter(f => f.animal_type === animalFilter)
        }

        // Filter by farm type
        if (farmTypeFilter !== 'all') {
            filteredFarms = filteredFarms.filter(f => f.farm_type === farmTypeFilter)
        }

        // Filter by disease or strain (need to check reports)
        if (diseaseFilter !== 'all' || strainFilter !== 'all') {
            const farmIdsWithMatchingReports = new Set(
                reports
                    .filter(r => {
                        const matchesDisease = diseaseFilter === 'all' || r.disease_name === diseaseFilter
                        const matchesStrain = strainFilter === 'all' || r.strain_subtype === strainFilter
                        return matchesDisease && matchesStrain
                    })
                    .map(r => r.farm_id)
            )
            filteredFarms = filteredFarms.filter(f => farmIdsWithMatchingReports.has(f.id))
        }

        // Process markers
        return filteredFarms.map((farm: any) => {
            const farmReports = reports.filter((r: any) => r.farm_id === farm.id)

            // Get highest severity report
            let highestSeverityReport = farmReports[0]
            farmReports.forEach((report: any) => {
                const severityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
                const currentLevel = severityOrder[report.severity as keyof typeof severityOrder] || 0
                const highestLevel = severityOrder[highestSeverityReport?.severity as keyof typeof severityOrder] || 0
                if (currentLevel > highestLevel) {
                    highestSeverityReport = report
                }
            })

            return {
                id: farm.id,
                name: farm.name,
                location: farm.location || 'Unknown',
                latitude: farm.latitude,
                longitude: farm.longitude,
                reportCount: farmReports.length,
                highestSeverity: highestSeverityReport?.severity || 'Low',
                disease: highestSeverityReport?.disease_name || 'N/A',
                strain: highestSeverityReport?.strain_subtype || 'N/A',
                animalType: farm.animal_type,
                farmType: farm.farm_type
            }
        })
    }, [farms, reports, animalFilter, farmTypeFilter, diseaseFilter, strainFilter])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="flex gap-4 h-[calc(100vh-140px)]">
            {/* Left Sidebar - Filters */}
            <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-y-auto flex-shrink-0">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                    <span className="text-xs text-gray-500">
                        ({filteredFarmMarkers.length} of {farms.length})
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Animal Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Animal Type</label>
                        <select
                            value={animalFilter}
                            onChange={(e) => setAnimalFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        >
                            <option value="all">All Animals</option>
                            {animalTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Farm Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Farm Type</label>
                        <select
                            value={farmTypeFilter}
                            onChange={(e) => setFarmTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        >
                            <option value="all">All Farm Types</option>
                            {farmTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Disease Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Disease</label>
                        <select
                            value={diseaseFilter}
                            onChange={(e) => setDiseaseFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        >
                            <option value="all">All Diseases</option>
                            {diseases.map(disease => (
                                <option key={disease} value={disease}>{disease}</option>
                            ))}
                        </select>
                    </div>

                    {/* Strain Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Strain</label>
                        <select
                            value={strainFilter}
                            onChange={(e) => setStrainFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        >
                            <option value="all">All Strains</option>
                            {strains.map(strain => (
                                <option key={strain} value={strain}>{strain}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Right Side - Map (Full Width) */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {filteredFarmMarkers.length > 0 ? (
                    <FarmMap farms={filteredFarmMarkers} />
                ) : (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="text-center">
                            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Farms Match Filters</h3>
                            <p className="text-gray-600 max-w-md">
                                No farms match the selected filters. Try adjusting your filter criteria.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
