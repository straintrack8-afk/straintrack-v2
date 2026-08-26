'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, FileText, AlertTriangle, TrendingUp, MapPin, Settings } from 'lucide-react'
import Link from 'next/link'
import { useOrganization } from '@/contexts/OrganizationContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { POULTRY_DISEASES, SWINE_DISEASES, DISEASE_STRAINS } from '@/lib/constants/diseases'

const ALL_DISEASES = [...POULTRY_DISEASES, ...SWINE_DISEASES].map(d => d.value).filter(v => v !== 'Other')
const ALL_STRAINS = [...new Set(Object.values(DISEASE_STRAINS).flat())].filter(s => s !== 'Other')

const CHART_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316']

const SEVERITY_COLORS: Record<string, string> = {
    Critical: '#EF4444',
    High: '#F97316',
    Medium: '#EAB308',
    Low: '#10B981',
}

export default function DashboardPage() {
    const supabase = createClient()
    const { activeOrg } = useOrganization()

    const [allReports, setAllReports] = useState<any[]>([])
    const [allFarms, setAllFarms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [period, setPeriod] = useState('all')
    const [animalType, setAnimalType] = useState('all')
    const [disease, setDisease] = useState('all')
    const [strain, setStrain] = useState('all')

    useEffect(() => {
        const loadData = async () => {
            if (!activeOrg?.id) {
                setLoading(false)
                return
            }

            setLoading(true)
            const isGlobalView = activeOrg.name === 'Super Admin Organization'

            let farmsQuery = supabase.from('farms').select('id, name')
            if (!isGlobalView) farmsQuery = farmsQuery.eq('organization_id', activeOrg.id)
            const { data: farmsData } = await farmsQuery
            setAllFarms(farmsData || [])

            let reportsQuery = supabase
                .from('disease_reports')
                .select('id, disease_name, animal_species, strain_subtype, severity, onset_date, created_at, farm_id, farms(name), organizations(name)')
                .order('created_at', { ascending: false })

            if (!isGlobalView) {
                reportsQuery = reportsQuery.eq('organization_id', activeOrg.id)
            }

            const { data: reportsData } = await reportsQuery
            setAllReports(reportsData || [])
            setLoading(false)
        }

        loadData()
    }, [activeOrg, supabase])

    const filteredReports = useMemo(() => {
        return allReports.filter(r => {
            if (period !== 'all') {
                const reportDate = new Date(r.created_at)
                const now = new Date()
                if (period === '7d') {
                    if (reportDate < new Date(now.getTime() - 7 * 86400000)) return false
                } else if (period === '30d') {
                    if (reportDate < new Date(now.getTime() - 30 * 86400000)) return false
                } else if (period === '90d') {
                    if (reportDate < new Date(now.getTime() - 90 * 86400000)) return false
                } else if (period === 'this_month') {
                    if (reportDate.getMonth() !== now.getMonth() || reportDate.getFullYear() !== now.getFullYear()) return false
                }
            }
            if (animalType !== 'all' && r.animal_species !== animalType) return false
            if (disease !== 'all' && r.disease_name !== disease) return false
            if (strain !== 'all' && r.strain_subtype !== strain) return false
            return true
        })
    }, [allReports, period, animalType, disease, strain])

    const stats = useMemo(() => {
        const now = new Date()
        const thisMonthCount = filteredReports.filter(r => {
            const d = new Date(r.created_at)
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length
        const activeOutbreaks = filteredReports.filter(r => r.severity === 'Critical' || r.severity === 'High').length
        return {
            totalFarms: allFarms.length,
            totalReports: filteredReports.length,
            activeOutbreaks,
            thisMonth: thisMonthCount,
        }
    }, [filteredReports, allFarms])

    const reportsPerWeek = useMemo(() => {
        const weeks: Record<string, number> = {}
        const now = new Date()
        for (let i = 7; i >= 0; i--) {
            const ws = new Date(now)
            ws.setDate(now.getDate() - now.getDay() - i * 7)
            weeks[ws.toISOString().slice(0, 10)] = 0
        }
        filteredReports.forEach(r => {
            const d = new Date(r.created_at)
            const ws = new Date(d)
            ws.setDate(d.getDate() - d.getDay())
            const key = ws.toISOString().slice(0, 10)
            if (key in weeks) weeks[key]++
        })
        return Object.entries(weeks).map(([date, count]) => ({
            week: new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            reports: count,
        }))
    }, [filteredReports])

    const diseaseDistribution = useMemo(() => {
        const map = new Map<string, number>()
        filteredReports.forEach(r => {
            const name = r.disease_name || 'Unknown'
            map.set(name, (map.get(name) || 0) + 1)
        })
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
    }, [filteredReports])

    const severityBreakdown = useMemo(() => {
        const map = new Map<string, number>()
        filteredReports.forEach(r => {
            const name = r.severity || 'Unknown'
            map.set(name, (map.get(name) || 0) + 1)
        })
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
    }, [filteredReports])

    const swineVsPoultry = useMemo(() => {
        const swine = filteredReports.filter(r => r.animal_species === 'Swine').length
        const poultry = filteredReports.filter(r => r.animal_species === 'Poultry').length
        return [
            { name: 'Swine', value: swine },
            { name: 'Poultry', value: poultry },
        ].filter(d => d.value > 0)
    }, [filteredReports])

    const recentReports = useMemo(() => filteredReports.slice(0, 8), [filteredReports])

    const availableDiseases = useMemo(() => {
        if (animalType === 'Poultry') return POULTRY_DISEASES.map(d => d.value).filter(v => v !== 'Other')
        if (animalType === 'Swine') return SWINE_DISEASES.map(d => d.value).filter(v => v !== 'Other')
        return ALL_DISEASES
    }, [animalType])

    const availableStrains = useMemo(() => {
        if (disease !== 'all' && DISEASE_STRAINS[disease]) return DISEASE_STRAINS[disease].filter(s => s !== 'Other')
        return ALL_STRAINS
    }, [disease])

    const resetFilters = () => {
        setPeriod('all')
        setAnimalType('all')
        setDisease('all')
        setStrain('all')
    }

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'Critical': return 'bg-red-100 text-red-700'
            case 'High': return 'bg-orange-100 text-orange-700'
            case 'Medium': return 'bg-yellow-100 text-yellow-700'
            case 'Low': return 'bg-green-100 text-green-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    const statCards = [
        { name: 'Total Farms', value: stats.totalFarms, icon: Building2, borderColor: 'border-t-blue-500', iconColor: 'bg-blue-500' },
        { name: 'Total Reports', value: stats.totalReports, icon: FileText, borderColor: 'border-t-purple-500', iconColor: 'bg-purple-500' },
        { name: 'Active Outbreaks', value: stats.activeOutbreaks, icon: AlertTriangle, borderColor: 'border-t-red-500', iconColor: 'bg-red-500' },
        { name: 'This Month', value: stats.thisMonth, icon: TrendingUp, borderColor: 'border-t-green-500', iconColor: 'bg-green-500' },
    ]

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1">Overview of your disease surveillance data</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <div key={stat.name} className={`bg-white rounded-lg border-t-4 ${stat.borderColor} shadow-sm p-5 hover:shadow-md transition`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className={`${stat.iconColor} p-3 rounded-full`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                            <p className="text-sm text-gray-600 mt-1">{stat.name}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Period</label>
                        <select value={period} onChange={(e) => setPeriod(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                            <option value="all">All Time</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="90d">Last 90 Days</option>
                            <option value="this_month">This Month</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Animal Type</label>
                        <select value={animalType} onChange={(e) => { setAnimalType(e.target.value); setDisease('all'); setStrain('all') }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                            <option value="all">All Animals</option>
                            <option value="Poultry">Poultry</option>
                            <option value="Swine">Swine</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Disease</label>
                        <select value={disease} onChange={(e) => { setDisease(e.target.value); setStrain('all') }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 max-w-[200px]">
                            <option value="all">All Diseases</option>
                            {availableDiseases.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Strain</label>
                        <select value={strain} onChange={(e) => setStrain(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 max-w-[200px]">
                            <option value="all">All Strains</option>
                            {availableStrains.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <button onClick={resetFilters}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                        Reset
                    </button>
                </div>
            </div>

            {/* Charts - 60/40 layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
                {/* Left column (60%) */}
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports per Week</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={reportsPerWeek}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="reports" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Disease Distribution</h3>
                        {diseaseDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={diseaseDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                        {diseaseDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex flex-col items-center justify-center text-gray-400">
                                <FileText className="w-12 h-12 mb-2" />
                                <p>No data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column (40%) */}
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Breakdown</h3>
                        {severityBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={severityBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
                                        {severityBreakdown.map((entry, i) => (
                                            <Cell key={i} fill={SEVERITY_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex flex-col items-center justify-center text-gray-400">
                                <AlertTriangle className="w-12 h-12 mb-2" />
                                <p>No data available</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Swine vs Poultry</h3>
                        {swineVsPoultry.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={swineVsPoultry} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
                                        <Cell fill="#F59E0B" />
                                        <Cell fill="#3B82F6" />
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex flex-col items-center justify-center text-gray-400">
                                <p>No data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Reports Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
                    <Link href="/dashboard/reports" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                        View All
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    {recentReports.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                            <FileText className="w-12 h-12 mb-3" />
                            <p className="mb-4 text-sm">No reports yet. Create your first disease report.</p>
                            <Link href="/dashboard/reports/new" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm">
                                Create Report
                            </Link>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disease</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Animal</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {recentReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {report.disease_name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {report.farms?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {report.animal_species || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {report.severity && (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(report.severity)}`}>
                                                    {report.severity}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(report.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/dashboard/farms" className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-4 hover:shadow-md transition group text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Manage Farms</h3>
                            <p className="text-blue-100 mt-1 text-xs">Add or edit farm locations</p>
                        </div>
                        <Building2 className="w-8 h-8 opacity-80" />
                    </div>
                </Link>

                <Link href="/dashboard/reports/new" className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-sm p-4 hover:shadow-md transition group text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">New Disease Report</h3>
                            <p className="text-pink-100 mt-1 text-xs">Report a new outbreak</p>
                        </div>
                        <FileText className="w-8 h-8 opacity-80" />
                    </div>
                </Link>

                <Link href="/dashboard/maps" className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-4 hover:shadow-md transition group text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">View Maps</h3>
                            <p className="text-green-100 mt-1 text-xs">Farm locations & outbreaks</p>
                        </div>
                        <MapPin className="w-8 h-8 opacity-80" />
                    </div>
                </Link>

                <Link href="/dashboard/settings" className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-4 hover:shadow-md transition group text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Settings</h3>
                            <p className="text-orange-100 mt-1 text-xs">Manage your account</p>
                        </div>
                        <Settings className="w-8 h-8 opacity-80" />
                    </div>
                </Link>
            </div>
        </div>
    )
}
