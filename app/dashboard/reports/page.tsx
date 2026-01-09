'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Plus, Search, ArrowUpDown, Edit2, X } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { DiseaseReport } from '@/lib/types'
import { useOrganization } from '@/contexts/OrganizationContext'

export default function ReportsPage() {
    const supabase = createClient()
    const { activeOrg } = useOrganization()
    const [reports, setReports] = useState<any[]>([])
    const [filteredReports, setFilteredReports] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [selectedReport, setSelectedReport] = useState<any | null>(null)

    // Filter & Sort states
    const [searchQuery, setSearchQuery] = useState('')
    const [animalFilter, setAnimalFilter] = useState<'All' | 'Swine' | 'Poultry'>('All')
    const [sortField, setSortField] = useState<'disease_name' | 'animal_species' | 'severity' | 'onset_date'>('onset_date')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

    useEffect(() => {
        loadReports()
        checkUserRole()
    }, [activeOrg])

    useEffect(() => {
        filterAndSortReports()
    }, [reports, searchQuery, animalFilter, sortField, sortDirection])

    const checkUserRole = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()

        setIsAdmin(userData?.role === 'admin' || userData?.role === 'super_admin')
    }

    const loadReports = async () => {
        if (!activeOrg?.id) {
            setLoading(false)
            return
        }

        setLoading(true)

        // Check if this is Super Admin Organization (Global View)
        const isGlobalView = activeOrg.name === 'Super Admin Organization'

        let reportsQuery = supabase
            .from('disease_reports')
            .select('*, farms(name), organizations(name)')
            .order('created_at', { ascending: false })

        if (!isGlobalView) {
            reportsQuery = reportsQuery.eq('organization_id', activeOrg.id)
        }

        const { data: reportsData } = await reportsQuery

        setReports(reportsData || [])
        setLoading(false)
    }

    const filterAndSortReports = () => {
        let filtered = [...reports]

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(report =>
                (report.disease_name && report.disease_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (report.strain_subtype && report.strain_subtype.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (report.animal_species && report.animal_species.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (report.farms?.name && report.farms.name.toLowerCase().includes(searchQuery.toLowerCase()))
            )
        }

        // Apply animal type filter
        if (animalFilter !== 'All') {
            filtered = filtered.filter(report => report.animal_species === animalFilter)
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[sortField]
            let bValue = b[sortField]

            // Handle null/undefined values
            if (!aValue) aValue = ''
            if (!bValue) bValue = ''

            // Special handling for dates
            if (sortField === 'onset_date') {
                aValue = new Date(aValue || a.created_at).getTime()
                bValue = new Date(bValue || b.created_at).getTime()
                return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
            }

            // String comparison
            if (sortDirection === 'asc') {
                return String(aValue).localeCompare(String(bValue))
            } else {
                return String(bValue).localeCompare(String(aValue))
            }
        })

        setFilteredReports(filtered)
    }

    const handleSort = (field: 'disease_name' | 'animal_species' | 'severity' | 'onset_date') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const handleRowClick = (report: any) => {
        setSelectedReport(report)
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'Critical': return 'bg-red-100 text-red-800'
            case 'High': return 'bg-orange-100 text-orange-800'
            case 'Medium': return 'bg-yellow-100 text-yellow-800'
            case 'Low': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
        }
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
                    <h1 className="text-3xl font-bold text-gray-900">Disease Reports</h1>
                    <p className="text-gray-600 mt-1">Track and manage disease outbreaks</p>
                </div>
                <Link
                    href="/dashboard/reports/new"
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Report
                </Link>
            </div>

            {/* Report Detail Card */}
            {selectedReport && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">{selectedReport.disease_name || 'Unknown Disease'}</h3>
                            {selectedReport.strain_subtype && (
                                <p className="text-sm text-gray-600">Strain: {selectedReport.strain_subtype}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedReport(null)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <p className="text-sm text-gray-600">Animal Species</p>
                            <p className="font-medium text-gray-900">{selectedReport.animal_species}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Farm</p>
                            <p className="font-medium text-gray-900">{selectedReport.farms?.name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Severity</p>
                            {selectedReport.severity && (
                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedReport.severity)}`}>
                                    {selectedReport.severity}
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Sick Count</p>
                            <p className="font-medium text-gray-900">{selectedReport.sick_count || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Death Count</p>
                            <p className="font-medium text-gray-900">{selectedReport.death_count || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Onset Date</p>
                            <p className="font-medium text-gray-900">{formatDate(selectedReport.onset_date || selectedReport.created_at)}</p>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex gap-3 pt-4 border-t">
                            <Link
                                href={`/dashboard/reports/${selectedReport.id}/edit`}
                                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit Report
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Search & Filter Bar */}
            {reports.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search reports..."
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
                            {filteredReports.length} of {reports.length} reports
                        </div>
                    </div>
                </div>
            )}

            {/* Reports Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {reports.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports yet</h3>
                        <p className="text-gray-600 mb-6">Create your first disease report to get started</p>
                        <Link
                            href="/dashboard/reports/new"
                            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Create Report
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                                        onClick={() => handleSort('disease_name')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Disease
                                            <ArrowUpDown className="w-4 h-4" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Strain
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                                        onClick={() => handleSort('animal_species')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Animal
                                            <ArrowUpDown className="w-4 h-4" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Farm
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                                        onClick={() => handleSort('severity')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Severity
                                            <ArrowUpDown className="w-4 h-4" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Sick/Dead
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                                        onClick={() => handleSort('onset_date')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Date
                                            <ArrowUpDown className="w-4 h-4" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredReports.map((report) => (
                                    <tr
                                        key={report.id}
                                        onClick={() => handleRowClick(report)}
                                        className="hover:bg-gray-50 cursor-pointer transition"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {report.disease_name || 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-700">
                                                {report.strain_subtype || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{report.animal_species}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {report.farms?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {report.severity && (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(report.severity)}`}>
                                                    {report.severity}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {report.sick_count || 0} / {report.death_count || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(report.onset_date || report.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredReports.length === 0 && searchQuery && (
                    <div className="p-12 text-center">
                        <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-gray-600">No reports found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>
        </div>
    )
}
