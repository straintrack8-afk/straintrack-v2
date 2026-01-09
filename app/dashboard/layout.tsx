'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard,
    Building2,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown,
    MapPin
} from 'lucide-react'
import Link from 'next/link'
import { User, Organization, OrganizationWithRole } from '@/lib/types'
import { OrganizationProvider } from '@/contexts/OrganizationContext'

const SUPER_ADMIN_EMAILS = new Set(['straintrack8@gmail.com'])

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const supabase = createClient()

    const [user, setUser] = useState<User | null>(null)
    const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
    const [activeOrg, setActiveOrg] = useState<OrganizationWithRole | null>(null)
    const [isSuperAdmin, setIsSuperAdmin] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadUserData = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/login')
                return
            }

            // Load user data
            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()

            if (!userData) {
                router.push('/login')
                return
            }

            setUser(userData)
            setIsSuperAdmin(SUPER_ADMIN_EMAILS.has(userData.email.toLowerCase()))

            // Load organizations
            if (userData.role === 'super_admin') {
                // Super admin: load all organizations
                const { data: allOrgs } = await supabase
                    .from('organizations')
                    .select('*')
                    .order('name')

                if (allOrgs) {
                    const orgsWithRole = allOrgs.map(org => ({ ...org, role: 'admin' as const }))

                    // Sort: Super Admin Organization first, then alphabetically
                    orgsWithRole.sort((a, b) => {
                        if (a.name === 'Super Admin Organization') return -1
                        if (b.name === 'Super Admin Organization') return 1
                        return a.name.localeCompare(b.name)
                    })

                    setOrganizations(orgsWithRole)
                    if (orgsWithRole.length > 0) {
                        setActiveOrg(orgsWithRole[0])
                    }
                }
            } else {
                // Regular user: load only their organizations
                const { data: userOrgs } = await supabase
                    .from('user_organizations')
                    .select('organization_id, role, organizations(*)')
                    .eq('user_id', userData.id)

                if (userOrgs) {
                    const orgsWithRole = userOrgs.map(uo => ({
                        ...uo.organizations,
                        role: uo.role
                    })) as OrganizationWithRole[]

                    setOrganizations(orgsWithRole)
                    if (orgsWithRole.length > 0) {
                        setActiveOrg(orgsWithRole[0])
                    }
                }
            }

            setLoading(false)
        }

        loadUserData()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/welcome')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Farms', href: '/dashboard/farms', icon: Building2 },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText },
        { name: 'Maps', href: '/dashboard/maps', icon: MapPin },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-20 px-6">
                        <div className="flex items-center">
                            <Image
                                src="/Logo 2.png"
                                alt="StrainTrack Logo"
                                width={96}
                                height={96}
                                className="object-contain"
                            />
                            <h1 className="text-xl font-bold text-gray-900 -ml-6">StrainTrack</h1>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Organization Info - Super Admin Only */}
                    {isSuperAdmin && (
                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <select
                                    value={activeOrg?.id || ''}
                                    onChange={(e) => {
                                        const org = organizations.find(o => o.id === e.target.value)
                                        setActiveOrg(org || null)
                                    }}
                                    className="w-full px-3 py-2 pr-8 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium appearance-none cursor-pointer hover:bg-gray-100 transition"
                                >
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>
                                            {org.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                <p className="text-xs text-primary-600 mt-2 font-medium">Super Admin View</p>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* User Info */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.full_name || user?.email}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="ml-2 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Top Header */}
                <header className="sticky top-0 z-30 h-20 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-4"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-semibold text-gray-900">
                            {activeOrg?.name || 'No Organization'}
                        </h2>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-2 lg:p-4">
                    <OrganizationProvider
                        activeOrg={activeOrg}
                        organizations={organizations}
                        isSuperAdmin={isSuperAdmin}
                    >
                        {children}
                    </OrganizationProvider>
                </main>
            </div>
        </div>
    )
}
