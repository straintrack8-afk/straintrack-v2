'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Plus, MapPin, Trash2, Search, ArrowUpDown, Navigation, X, Edit2 } from 'lucide-react'
import { Farm } from '@/lib/types'
import { useOrganization } from '@/contexts/OrganizationContext'

// Farm type options
const SWINE_FARM_TYPES = [
    'Breeder - GGP',
    'Breeder - GP',
    'Breeder - PS',
    'Nursery',
    'Fattening'
]

const POULTRY_FARM_TYPES = [
    'Breeder',
    'Commercial Farm',
    'Hatchery'
]

const CHICKEN_TYPES = [
    'Color Chicken',
    'Broiler',
    'Layer',
    'Duck'
]

interface FormData {
    name: string
    location: string
    latitude: number | null
    longitude: number | null
    animal_type: 'Swine' | 'Poultry' | null
    farm_type: string | null
    chicken_type: string | null
}

export default function FarmsPage() {
    const supabase = createClient()
    const { activeOrg } = useOrganization()
    const [farms, setFarms] = useState<Farm[]>([])
    const [filteredFarms, setFilteredFarms] = useState<Farm[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [formData, setFormData] = useState<FormData>({
        name: '',
        location: '',
        latitude: null,
        longitude: null,
        animal_type: null,
        farm_type: null,
        chicken_type: null
    })
    const [submitting, setSubmitting] = useState(false)
    const [gettingLocation, setGettingLocation] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [animalFilter, setAnimalFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<'name' | 'location' | 'animal_type'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    useEffect(() => {
        loadFarms()
        checkUserRole()
    }, [activeOrg])

    useEffect(() => {
        filterAndSortFarms()
    }, [farms, searchTerm, animalFilter, sortBy, sortOrder])

    const checkUserRole = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!activeOrg?.id) return

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()

        setIsAdmin(userData?.role === 'admin' || userData?.role === 'super_admin')
    }

    const loadFarms = async () => {
        if (!activeOrg?.id) {
            setLoading(false)
            return
        }

        setLoading(true)

        // Check if this is Super Admin Organization (Global View)
        const isGlobalView = activeOrg.name === 'Super Admin Organization'

        let farmsQuery = supabase
            .from('farms')
            .select('*, organizations(name)')
            .order('name')

        if (!isGlobalView) {
            farmsQuery = farmsQuery.eq('organization_id', activeOrg.id)
        }

        const { data: farmsData } = await farmsQuery

        setFarms(farmsData || [])
        setLoading(false)
    }

    const filterAndSortFarms = () => {
        let filtered = [...farms]

        if (searchTerm) {
            filtered = filtered.filter(farm =>
                farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (farm.location && farm.location.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        }

        if (animalFilter !== 'All') {
            filtered = filtered.filter(farm => farm.animal_type === animalFilter)
        }

        filtered.sort((a, b) => {
            const aValue = a[sortBy]
            const bValue = b[sortBy]
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
            return 0
        })

        setFilteredFarms(filtered)
    }

    const handleSort = (field: 'name' | 'location') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(field)
            setSortOrder('asc')
        }
    }

    const handleRowClick = (farm: Farm) => {
        setSelectedFarm(farm)
        setIsEditing(false)
    }

    const handleEditClick = (farm: Farm) => {
        setSelectedFarm(farm)
        setIsEditing(true)
        setFormData({
            name: farm.name,
            location: farm.location || '',
            latitude: farm.latitude,
            longitude: farm.longitude,
            animal_type: farm.animal_type,
            farm_type: farm.farm_type,
            chicken_type: farm.chicken_type
        })
    }

    const getGPSLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser')
            return
        }

        setGettingLocation(true)

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData({
                    ...formData,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                })
                setGettingLocation(false)
            },
            (error) => {
                alert('Unable to get location: ' + error.message)
                setGettingLocation(false)
            }
        )
    }

    const resetForm = () => {
        setFormData({
            name: '',
            location: '',
            latitude: null,
            longitude: null,
            animal_type: null,
            farm_type: null,
            chicken_type: null
        })
        setShowAddForm(false)
        setSelectedFarm(null)
        setIsEditing(false)
    }

    const isFormValid = () => {
        if (!formData.name.trim() || !formData.location.trim()) return false
        if (!formData.animal_type) return false
        if (!formData.farm_type) return false
        if (formData.animal_type === 'Poultry' && !formData.chicken_type) return false
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeOrg?.id || !isFormValid()) return

        setSubmitting(true)

        if (isEditing && selectedFarm) {
            const { error } = await supabase
                .from('farms')
                .update({
                    name: formData.name,
                    location: formData.location,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    animal_type: formData.animal_type,
                    farm_type: formData.farm_type,
                    chicken_type: formData.chicken_type
                })
                .eq('id', selectedFarm.id)

            if (!error) {
                resetForm()
                loadFarms()
            } else {
                alert('Error updating farm: ' + error.message)
            }
        } else {
            const { error } = await supabase
                .from('farms')
                .insert({
                    organization_id: activeOrg.id,
                    name: formData.name,
                    location: formData.location,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    animal_type: formData.animal_type,
                    farm_type: formData.farm_type,
                    chicken_type: formData.chicken_type
                })

            if (!error) {
                resetForm()
                loadFarms()
            } else {
                alert('Error adding farm: ' + error.message)
            }
        }

        setSubmitting(false)
    }

    const handleDeleteFarm = async (farmId: string) => {
        if (!confirm('Are you sure you want to delete this farm?')) return

        await supabase
            .from('farms')
            .delete()
            .eq('id', farmId)

        setSelectedFarm(null)
        loadFarms()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Farms</h1>
                    <p className="text-gray-600 mt-1">Manage your farm locations</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Farm
                </button>
            </div>

            {/* Single Page Add/Edit Form */}
            {(showAddForm || isEditing) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-h-[600px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {isEditing ? 'Edit Farm' : 'Add New Farm'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="p-1 hover:bg-gray-100 rounded-lg transition"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Section 1: Basic Information */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-900 border-b pb-2">Basic Information</h4>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Farm Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="e.g., North Farm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Location <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="e.g., Hanoi, Vietnam"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    GPS Coordinates (Optional)
                                </label>
                                <button
                                    type="button"
                                    onClick={getGPSLocation}
                                    disabled={gettingLocation}
                                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                                >
                                    <Navigation className="w-5 h-5 mr-2" />
                                    {gettingLocation ? 'Getting Location...' : 'Get Current Location'}
                                </button>
                                {formData.latitude && formData.longitude && (
                                    <p className="text-sm text-green-600 mt-2">
                                        ✓ Location captured: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Section 2: Animal Type */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-900 border-b pb-2">Animal Type <span className="text-red-500">*</span></h4>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, animal_type: 'Swine', farm_type: null, chicken_type: null })}
                                    className={`p-4 border-2 rounded-lg transition ${formData.animal_type === 'Swine'
                                        ? 'border-primary-600 bg-primary-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="font-semibold text-lg">Swine</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, animal_type: 'Poultry', farm_type: null, chicken_type: null })}
                                    className={`p-4 border-2 rounded-lg transition ${formData.animal_type === 'Poultry'
                                        ? 'border-primary-600 bg-primary-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="font-semibold text-lg">Poultry</div>
                                </button>
                            </div>
                        </div>

                        {/* Section 3: Farm Type (conditional) */}
                        {formData.animal_type && (
                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-900 border-b pb-2">
                                    {formData.animal_type} Farm Type <span className="text-red-500">*</span>
                                </h4>

                                <div className="grid grid-cols-2 gap-3">
                                    {(formData.animal_type === 'Swine' ? SWINE_FARM_TYPES : POULTRY_FARM_TYPES).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, farm_type: type })}
                                            className={`p-3 border-2 rounded-lg text-left transition ${formData.farm_type === type
                                                ? 'border-primary-600 bg-primary-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="font-medium text-sm">{type}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section 4: Chicken Type (Poultry only) */}
                        {formData.animal_type === 'Poultry' && (
                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-900 border-b pb-2">
                                    Chicken Type <span className="text-red-500">*</span>
                                </h4>

                                <div className="grid grid-cols-2 gap-4">
                                    {CHICKEN_TYPES.map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, chicken_type: type })}
                                            className={`p-4 border-2 rounded-lg transition ${formData.chicken_type === type
                                                ? 'border-primary-600 bg-primary-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="font-medium">{type}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!isFormValid() || submitting}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                            >
                                {submitting ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Farm' : 'Add Farm')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Farm Detail Card */}
            {selectedFarm && !isEditing && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                            <div className="p-3 bg-primary-100 rounded-lg mr-4">
                                <Building2 className="w-8 h-8 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">{selectedFarm.name}</h3>
                                <p className="text-sm text-gray-600">{selectedFarm.location}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedFarm(null)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-sm text-gray-600">Animal Type</p>
                            <p className="font-medium text-gray-900">{selectedFarm.animal_type || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Farm Type</p>
                            <p className="font-medium text-gray-900">{selectedFarm.farm_type || '-'}</p>
                        </div>
                        {selectedFarm.chicken_type && (
                            <div>
                                <p className="text-sm text-gray-600">Chicken Type</p>
                                <p className="font-medium text-gray-900">{selectedFarm.chicken_type}</p>
                            </div>
                        )}
                        {selectedFarm.latitude && selectedFarm.longitude && (
                            <div>
                                <p className="text-sm text-gray-600">GPS Coordinates</p>
                                <p className="font-medium text-gray-900">
                                    {selectedFarm.latitude.toFixed(6)}, {selectedFarm.longitude.toFixed(6)}
                                </p>
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                onClick={() => handleEditClick(selectedFarm)}
                                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit Farm
                            </button>
                            <button
                                onClick={() => handleDeleteFarm(selectedFarm.id)}
                                className="flex items-center px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Farm
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Search & Filter Bar */}
            {farms.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search farms..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAnimalFilter('All')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${animalFilter === 'All'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setAnimalFilter('Swine')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${animalFilter === 'Swine'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Swine
                            </button>
                            <button
                                onClick={() => setAnimalFilter('Poultry')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${animalFilter === 'Poultry'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Poultry
                            </button>
                        </div>
                        <div className="text-sm text-gray-600">
                            {filteredFarms.length} of {farms.length} farms
                        </div>
                    </div>
                </div>
            )}

            {/* Farms Table */}
            {farms.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No farms yet</h3>
                    <p className="text-gray-600 mb-6">Get started by adding your first farm location</p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Farm
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Farm Name
                                            <ArrowUpDown className="w-4 h-4" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Animal Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Farm Type
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                                        onClick={() => handleSort('location')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Location
                                            <ArrowUpDown className="w-4 h-4" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredFarms.map((farm) => (
                                    <tr
                                        key={farm.id}
                                        onClick={() => handleRowClick(farm)}
                                        className="hover:bg-gray-50 transition cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="p-2 bg-primary-100 rounded-lg mr-3">
                                                    <Building2 className="w-5 h-5 text-primary-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{farm.name}</div>
                                                    {farm.chicken_type && (
                                                        <div className="text-xs text-gray-500">{farm.chicken_type}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700">
                                                {farm.animal_type || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700">{farm.farm_type || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {farm.location ? (
                                                <div>
                                                    <div className="flex items-center text-sm text-gray-700">
                                                        <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                                                        {farm.location}
                                                    </div>
                                                    {farm.latitude && farm.longitude && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">No location</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredFarms.length === 0 && searchTerm && (
                        <div className="text-center py-12">
                            <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">No farms found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
