'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, FileText, AlertTriangle, CalendarDays, TrendingUp, Filter, X } from 'lucide-react'
import Link from 'next/link'
import { useOrganization } from '@/contexts/OrganizationContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const getPeriodCutoff = (period: string): Date => {
    const now = new Date()
    switch (period) {
        case '7d':   { const d = new Date(now); d.setDate(d.getDate() - 7); return d }
        case '30d':  { const d = new Date(now); d.setDate(d.getDate() - 30); return d }
        case '3m':   { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d }
        case '6m':   { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d }
        case 'year': { return new Date(now.getFullYear(), 0, 1) }
        default:     return new Date(0)
    }
}

export default function DashboardPage() {
    const supabase = createClient()
    const { activeOrg } = useOrganization()

    // Raw fetched data
    const [allReports, setAllReports] = useState<any[]>([])
    const [totalFarms, setTotalFarms] = useState(0)
    const [recentReports, setRecentReports] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Filter states
    const [periodFilter, setPeriodFilter] = useState('all')
    const [animalFilter, setAnimalFilter] = useState('all')
    const [diseaseFilter, setDiseaseFilter] = useState('all')
    const [strainFilter, setStrainFilter] = useState('all')

    useEffect(() => {
        const loadData = async () => {
            if (!activeOrg?.id) { setLoading(false); return }
            setLoading(true)
            const isGlobalView = activeOrg.name === 'Super Admin Organization'

            // Farms count — not report-based, stays unfiltered
            let farmsQ = supabase.from('farms').select('*', { count: 'exact', head: true })
            if (!isGlobalView) farmsQ = farmsQ.eq('organization_id', activeOrg.id)
            const { count: farmsCount } = await farmsQ
            setTotalFarms(farmsCount || 0)

            // All reports raw — single fetch, filtered client-side
            let reportsQ = supabase
                .from('disease_reports')
                .select('id, disease_name, animal_species, strain_subtype, severity, created_at')
            if (!isGlobalView) reportsQ = reportsQ.eq('organization_id', activeOrg.id)
            const { data: reportsData } = await reportsQ
            setAllReports(reportsData || [])

            // Recent reports for the table (static, not affected by chart filters)
            let recentQ = supabase
                .from('disease_reports')
                .select('id, disease_name, animal_species, severity, created_at, farms(name)')
                .order('created_at', { ascending: false })
                .limit(8)
            if (!isGlobalView) recentQ = recentQ.eq('organization_id', activeOrg.id)
            const { data: recentData } = await recentQ
            setRecentReports(recentData || [])

            setLoading(false)
        }
        loadData()
    }, [activeOrg])

    // Cascading filter resets (same pattern as maps page)
    useEffect(() => { setAnimalFilter('all'); setDiseaseFilter('all'); setStrainFilter('all') }, [periodFilter])
    useEffect(() => { setDiseaseFilter('all'); setStrainFilter('all') }, [animalFilter])
    useEffect(() => { setStrainFilter('all') }, [diseaseFilter])

    // Filtered reports — drives all 4 charts + 3 stat cards
    const filteredReports = useMemo(() => {
        let r = allReports
        if (periodFilter !== 'all') { const c = getPeriodCutoff(periodFilter); r = r.filter(x => new Date(x.created_at) >= c) }
        if (animalFilter !== 'all') r = r.filter(x => x.animal_species === animalFilter)
        if (diseaseFilter !== 'all') r = r.filter(x => x.disease_name === diseaseFilter)
        if (strainFilter !== 'all') r = r.filter(x => x.strain_subtype === strainFilter)
        return r
    }, [allReports, periodFilter, animalFilter, diseaseFilter, strainFilter])

    // Cascading dropdown options
    const animalTypes = useMemo(() =>
        Array.from(new Set(allReports.map(r => r.animal_species).filter(Boolean))).sort() as string[]
    , [allReports])

    const diseases = useMemo(() => {
        let base = allReports
        if (periodFilter !== 'all') { const c = getPeriodCutoff(periodFilter); base = base.filter(r => new Date(r.created_at) >= c) }
        if (animalFilter !== 'all') base = base.filter(r => r.animal_species === animalFilter)
        return Array.from(new Set(base.map(r => r.disease_name).filter(Boolean))).sort() as string[]
    }, [allReports, periodFilter, animalFilter])

    const strains = useMemo(() => {
        let base = allReports
        if (periodFilter !== 'all') { const c = getPeriodCutoff(periodFilter); base = base.filter(r => new Date(r.created_at) >= c) }
        if (animalFilter !== 'all') base = base.filter(r => r.animal_species === animalFilter)
        if (diseaseFilter !== 'all') base = base.filter(r => r.disease_name === diseaseFilter)
        return Array.from(new Set(base.map(r => r.strain_subtype).filter(Boolean))).sort() as string[]
    }, [allReports, periodFilter, animalFilter, diseaseFilter])

    // Stat card values (3 of 4 are filter-aware; Total Farms is not report-based)
    const totalReports = filteredReports.length
    const activeOutbreaks = useMemo(() =>
        filteredReports.filter(r => ['High', 'Critical'].includes(r.severity)).length
    , [filteredReports])
    const thisMonth = useMemo(() => {
        const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
        return filteredReports.filter(r => new Date(r.created_at) >= start).length
    }, [filteredReports])

    // Chart data — all derived from filteredReports
    const { weeklyData, chartTitle } = useMemo(() => {
        type Bucket = { label: string; start: Date; end: Date; reports: number }
        const now = new Date()
        const buckets: Bucket[] = []
        let title = 'Reports per Week (Last 8 Weeks)'

        if (periodFilter === '7d') {
            // Daily buckets for last 7 days
            title = 'Reports per Day (Last 7 Days)'
            for (let i = 6; i >= 0; i--) {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0)
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999)
                buckets.push({ label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), start, end, reports: 0 })
            }
        } else if (periodFilter === '30d') {
            // 5 weekly buckets
            title = 'Reports per Week (Last 30 Days)'
            for (let i = 4; i >= 0; i--) {
                const end = new Date(now); end.setDate(end.getDate() - i * 7); end.setHours(23, 59, 59, 999)
                const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0)
                buckets.push({ label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), start, end, reports: 0 })
            }
        } else if (periodFilter === '3m') {
            // Monthly buckets for last 3 months
            title = 'Reports per Month (Last 3 Months)'
            for (let i = 2; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
                buckets.push({ label: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), start, end, reports: 0 })
            }
        } else if (periodFilter === '6m') {
            // Monthly buckets for last 6 months
            title = 'Reports per Month (Last 6 Months)'
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
                buckets.push({ label: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), start, end, reports: 0 })
            }
        } else if (periodFilter === 'year') {
            // Monthly buckets for this calendar year
            title = 'Reports per Month (This Year)'
            for (let i = 0; i < 12; i++) {
                const start = new Date(now.getFullYear(), i, 1, 0, 0, 0, 0)
                const end = new Date(now.getFullYear(), i + 1, 0, 23, 59, 59, 999)
                buckets.push({ label: start.toLocaleDateString('en-US', { month: 'short' }), start, end, reports: 0 })
            }
        } else {
            // 'all' — last 8 weekly buckets
            title = 'Reports per Week (Last 8 Weeks)'
            for (let i = 7; i >= 0; i--) {
                const end = new Date(now); end.setDate(end.getDate() - i * 7); end.setHours(23, 59, 59, 999)
                const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0)
                buckets.push({ label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), start, end, reports: 0 })
            }
        }

        filteredReports.forEach(r => {
            const d = new Date(r.created_at)
            for (const b of buckets) { if (d >= b.start && d <= b.end) { b.reports++; break } }
        })

        return { weeklyData: buckets.map(b => ({ week: b.label, reports: b.reports })), chartTitle: title }
    }, [filteredReports, periodFilter])

    const severityData = useMemo(() => {
        const counts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 }
        filteredReports.forEach(r => { if (r.severity && r.severity in counts) counts[r.severity]++ })
        return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
    }, [filteredReports])

    const speciesData = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredReports.forEach(r => { const s = r.animal_species || 'Unknown'; counts[s] = (counts[s] || 0) + 1 })
        return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
    }, [filteredReports])

    const diseaseData = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredReports.forEach(r => { const n = r.disease_name || 'Unknown'; counts[n] = (counts[n] || 0) + 1 })
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        const top6 = sorted.slice(0, 6)
        const otherCount = sorted.slice(6).reduce((sum, [, v]) => sum + v, 0)
        return [...top6.map(([name, value]) => ({ name, value })), ...(otherCount > 0 ? [{ name: 'Other', value: otherCount }] : [])]
    }, [filteredReports])

    const isFiltered = periodFilter !== 'all' || animalFilter !== 'all' || diseaseFilter !== 'all' || strainFilter !== 'all'
    const resetFilters = () => {
        setPeriodFilter('all')
        setAnimalFilter('all')
        setDiseaseFilter('all')
        setStrainFilter('all')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    const SEVERITY_COLORS: Record<string, string> = {
        Low: '#10B981',
        Medium: '#F59E0B',
        High: '#F97316',
        Critical: '#EF4444',
    }

    const SPECIES_COLORS: Record<string, string> = {
        Swine: '#ec4899',
        Poultry: '#f59e0b',
    }

    const DISEASE_COLORS = ['#0d9488', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#f97316', '#94a3b8']

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'Critical': return 'bg-red-100 text-red-700'
            case 'High': return 'bg-orange-100 text-orange-700'
            case 'Medium': return 'bg-yellow-100 text-yellow-700'
            case 'Low': return 'bg-green-100 text-green-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const statCards = [
        {
            label: 'TOTAL FARMS',
            value: totalFarms,
            subtitle: 'registered farm locations',
            icon: Building2,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            borderColor: 'border-t-blue-500',
        },
        {
            label: 'TOTAL REPORTS',
            value: totalReports,
            subtitle: 'disease reports submitted',
            icon: FileText,
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            borderColor: 'border-t-purple-500',
        },
        {
            label: 'ACTIVE OUTBREAKS',
            value: activeOutbreaks,
            subtitle: 'high or critical severity',
            icon: AlertTriangle,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            borderColor: 'border-t-red-500',
        },
        {
            label: 'THIS MONTH',
            value: thisMonth,
            subtitle: 'reports this calendar month',
            icon: CalendarDays,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            borderColor: 'border-t-green-500',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1">Overview of your disease surveillance data</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className={`bg-white rounded-xl border-t-4 ${card.borderColor} shadow-sm p-5`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-500 tracking-wider">{card.label}</p>
                            <div className={`${card.iconBg} p-2 rounded-lg`}>
                                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2 self-center mr-1">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filters</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Period</label>
                        <select
                            value={periodFilter}
                            onChange={e => setPeriodFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="all">All Time</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="3m">Last 3 Months</option>
                            <option value="6m">Last 6 Months</option>
                            <option value="year">This Year</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Animal Type</label>
                        <select
                            value={animalFilter}
                            onChange={e => setAnimalFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="all">All Animals</option>
                            {animalTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Disease</label>
                        <select
                            value={diseaseFilter}
                            onChange={e => setDiseaseFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="all">All Diseases</option>
                            {diseases.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Strain</label>
                        <select
                            value={strainFilter}
                            onChange={e => setStrainFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="all">All Strains</option>
                            {strains.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {isFiltered && (
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-1.5 self-end px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition border border-gray-300"
                        >
                            <X className="w-4 h-4" />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Charts — 60/40 two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6">

                {/* Left column: Reports per Week + Disease Distribution */}
                <div className="flex flex-col gap-6">
                    {/* Weekly Bar Chart */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">{chartTitle}</h3>
                        {weeklyData.some(w => w.reports > 0) ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={weeklyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                                        formatter={(v: number | undefined) => [v ?? 0, 'Reports']}
                                    />
                                    <Bar dataKey="reports" fill="#0d9488" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                                <FileText className="w-10 h-10 mb-2" />
                                <p className="text-sm">No reports for the selected period</p>
                            </div>
                        )}
                    </div>

                    {/* Disease Distribution Donut */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Disease Distribution</h3>
                        {diseaseData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={diseaseData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={55}
                                        outerRadius={82}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {diseaseData.map((entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={DISEASE_COLORS[index % DISEASE_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                                    />
                                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                                <FileText className="w-10 h-10 mb-2" />
                                <p className="text-sm">No report data yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column: Severity Breakdown + Swine vs Poultry */}
                <div className="flex flex-col gap-6">
                    {/* Severity Donut */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Severity Breakdown</h3>
                        {severityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={severityData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={55}
                                        outerRadius={82}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {severityData.map((entry, index) => (
                                            <Cell key={index} fill={SEVERITY_COLORS[entry.name] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                                    />
                                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                                <AlertTriangle className="w-10 h-10 mb-2" />
                                <p className="text-sm">No report data yet</p>
                            </div>
                        )}
                    </div>

                    {/* Swine vs Poultry Donut */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Swine vs Poultry Ratio</h3>
                        {speciesData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={speciesData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={55}
                                        outerRadius={82}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {speciesData.map((entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={SPECIES_COLORS[entry.name] || '#94a3b8'}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                                    />
                                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                                <FileText className="w-10 h-10 mb-2" />
                                <p className="text-sm">No report data yet</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Recent Reports Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">Recent Reports</h3>
                    <Link href="/dashboard/reports" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                        View all →
                    </Link>
                </div>
                {recentReports.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                        <FileText className="w-10 h-10 mb-3" />
                        <p className="text-sm mb-4">No reports yet.</p>
                        <Link href="/dashboard/reports/new" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm">
                            Create Report
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disease</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Animal Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{report.disease_name || '—'}</td>
                                        <td className="px-6 py-3 text-sm text-gray-600">{report.farms?.name || '—'}</td>
                                        <td className="px-6 py-3 text-sm text-gray-600">{report.animal_species || '—'}</td>
                                        <td className="px-6 py-3">
                                            {report.severity ? (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(report.severity)}`}>
                                                    {report.severity}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-500">
                                            {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
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
                            <p className="text-green-100 mt-1 text-xs">Farm locations &amp; outbreaks</p>
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
        </div>
    )
}
