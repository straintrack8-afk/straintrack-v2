'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, FileText, AlertTriangle, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { useOrganization } from '@/contexts/OrganizationContext'
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DashboardStats {
    totalFarms: number
    totalReports: number
    activeOutbreaks: number
    recentReports: any[]
    monthlyData: any[]
    diseaseDistribution: any[]
}

export default function DashboardPage() {
    const supabase = createClient()
    const { activeOrg } = useOrganization()
    const [stats, setStats] = useState<DashboardStats>({
        totalFarms: 0,
        totalReports: 0,
        activeOutbreaks: 0,
        recentReports: [],
        monthlyData: [],
        diseaseDistribution: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!activeOrg?.id) {
                setLoading(false)
                return
            }

            setLoading(true)

            // Check if this is Super Admin Organization (Global View)
            const isGlobalView = activeOrg.name === 'Super Admin Organization'

            // Load farms count
            let farmsQuery = supabase
                .from('farms')
                .select('*', { count: 'exact', head: true })

            if (!isGlobalView) {
                farmsQuery = farmsQuery.eq('organization_id', activeOrg.id)
            }

            const { count: farmsCount } = await farmsQuery

            // Load reports count
            let reportsQuery = supabase
                .from('disease_reports')
                .select('*', { count: 'exact', head: true })

            if (!isGlobalView) {
                reportsQuery = reportsQuery.eq('organization_id', activeOrg.id)
            }

            const { count: reportsCount } = await reportsQuery

            // Load recent reports
            let recentReportsQuery = supabase
                .from('disease_reports')
                .select('id, disease_name, animal_species, onset_date, severity, sick_count, death_count, created_at, farms(name), organizations(name)')
                .order('created_at', { ascending: false })
                .limit(6)

            if (!isGlobalView) {
                recentReportsQuery = recentReportsQuery.eq('organization_id', activeOrg.id)
            }

            const { data: recentReports } = await recentReportsQuery

            // Calculate disease distribution
            const diseaseMap = new Map()
            recentReports?.forEach(report => {
                const disease = report.disease_name || 'Unknown'
                diseaseMap.set(disease, (diseaseMap.get(disease) || 0) + 1)
            })
            const diseaseDistribution = Array.from(diseaseMap.entries()).map(([name, value]) => ({ name, value }))

            setStats({
                totalFarms: farmsCount || 0,
                totalReports: reportsCount || 0,
                activeOutbreaks: recentReports?.filter(r => r.severity === 'Critical' || r.severity === 'High').length || 0,
                recentReports: recentReports || [],
                monthlyData: [],
                diseaseDistribution
            })

            setLoading(false)
        }

        loadDashboardData()
    }, [activeOrg, supabase])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    const statCards = [
        {
            name: 'Total Farms',
            value: stats.totalFarms,
            change: '+5.2%',
            isPositive: true,
            icon: Building2,
            bgColor: 'bg-blue-50',
            iconColor: 'bg-blue-500',
            borderColor: 'border-l-blue-500'
        },
        {
            name: 'Total Reports',
            value: stats.totalReports,
            change: '+12.5%',
            isPositive: true,
            icon: FileText,
            bgColor: 'bg-pink-50',
            iconColor: 'bg-pink-500',
            borderColor: 'border-l-pink-500'
        },
        {
            name: 'Active Outbreaks',
            value: stats.activeOutbreaks,
            change: '-4.3%',
            isPositive: false,
            icon: AlertTriangle,
            bgColor: 'bg-green-50',
            iconColor: 'bg-green-500',
            borderColor: 'border-l-green-500'
        },
        {
            name: 'This Month',
            value: stats.recentReports.length,
            change: '+8.4%',
            isPositive: true,
            icon: TrendingUp,
            bgColor: 'bg-orange-50',
            iconColor: 'bg-orange-500',
            borderColor: 'border-l-orange-500'
        },
    ]

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'Critical': return 'bg-red-500'
            case 'High': return 'bg-orange-500'
            case 'Medium': return 'bg-yellow-500'
            case 'Low': return 'bg-green-500'
            default: return 'bg-gray-500'
        }
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

    const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6']

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1">Overview of your disease surveillance data</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <div
                        key={stat.name}
                        className={`bg-white rounded-lg border-l-4 ${stat.borderColor} shadow-sm p-5 hover:shadow-md transition`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`${stat.iconColor} p-3 rounded-full`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                            <div className={`flex items-center text-sm font-medium ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {stat.isPositive ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                                {stat.change}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                            <p className="text-sm text-gray-600 mt-1">{stat.name}</p>
                            <p className="text-xs text-gray-500 mt-1">from last week</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions - 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                    href="/dashboard/farms"
                    className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-4 hover:shadow-md transition group text-white"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Manage Farms</h3>
                            <p className="text-blue-100 mt-1 text-xs">Add or edit farm locations</p>
                        </div>
                        <Building2 className="w-8 h-8 opacity-80" />
                    </div>
                </Link>

                <Link
                    href="/dashboard/reports/new"
                    className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-sm p-4 hover:shadow-md transition group text-white"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">New Disease Report</h3>
                            <p className="text-pink-100 mt-1 text-xs">Report a new outbreak</p>
                        </div>
                        <FileText className="w-8 h-8 opacity-80" />
                    </div>
                </Link>

                <Link
                    href="/dashboard/maps"
                    className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-4 hover:shadow-md transition group text-white"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">View Maps</h3>
                            <p className="text-green-100 mt-1 text-xs">Farm locations & outbreaks</p>
                        </div>
                        <TrendingUp className="w-8 h-8 opacity-80" />
                    </div>
                </Link>

                <Link
                    href="/dashboard/settings"
                    className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-4 hover:shadow-md transition group text-white"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Settings</h3>
                            <p className="text-orange-100 mt-1 text-xs">Manage your account</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 opacity-80" />
                    </div>
                </Link>
            </div>

            {/* Disease Distribution & Recent Reports Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-4">
                {/* Disease Distribution */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Disease Distribution</h3>
                    </div>
                    {stats.diseaseDistribution.length > 0 ? (
                        <div className="space-y-3">
                            {stats.diseaseDistribution.slice(0, 5).map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center flex-1">
                                        <div className={`w-3 h-3 rounded-full mr-3`} style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span className="text-sm text-gray-700 truncate">{item.name}</span>
                                    </div>
                                    <div className="flex items-center ml-4">
                                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                            <div
                                                className="h-2 rounded-full"
                                                style={{
                                                    width: `${(item.value / Math.max(...stats.diseaseDistribution.map(d => d.value))) * 100}%`,
                                                    backgroundColor: COLORS[index % COLORS.length]
                                                }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">{item.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                            <FileText className="w-12 h-12 mb-2" />
                            <p>No data available</p>
                        </div>
                    )}
                </div>

                {/* Recent Reports */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
                        <Link href="/dashboard/reports" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            View All
                        </Link>
                    </div>
                    <div className="p-6">
                        {stats.recentReports.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                                <FileText className="w-12 h-12 mb-3" />
                                <p className="mb-4 text-sm">No reports yet. Create your first disease report.</p>
                                <Link
                                    href="/dashboard/reports/new"
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
                                >
                                    Create Report
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentReports.slice(0, 5).map((report) => (
                                    <div key={report.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">{report.disease_name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">
                                                {report.farms?.name || 'N/A'} • {report.animal_species}
                                                {activeOrg?.name === 'Super Admin Organization' && report.organizations?.name && (
                                                    <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                                                        {report.organizations.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {report.severity && (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(report.severity)}`}>
                                                    {report.severity}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
