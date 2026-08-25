'use client'

import { useEffect, useState, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Building2, Users, Settings as SettingsIcon, Copy, Check, Shield, Trash2, AlertCircle, ChevronDown, ChevronUp, Mail, X } from 'lucide-react'

const SUPER_ADMIN_EMAILS = new Set(['straintrack8@gmail.com'])
const JOB_TITLES = ['Technical', 'Sales', 'Manager', 'Veterinarian', 'Veterinary Technician', 'Other']

export default function SettingsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [user, setUser] = useState<any>(null)
    const [organization, setOrganization] = useState<any>(null)
    const [members, setMembers] = useState<any[]>([])
    const [memberReportCounts, setMemberReportCounts] = useState<Record<string, number>>({})
    const [isSuperAdmin, setIsSuperAdmin] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [allOrgs, setAllOrgs] = useState<any[]>([])

    // Get active tab from URL or default to 'profile'
    const activeTab = searchParams.get('tab') || 'profile'

    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(true)

    // Member management states
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [changingRole, setChangingRole] = useState<string | null>(null)

    // Invite modal states
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteJobTitle, setInviteJobTitle] = useState('')
    const [inviting, setInviting] = useState(false)
    const [inviteError, setInviteError] = useState('')
    const [inviteSuccess, setInviteSuccess] = useState(false)

    // Profile editing states
    const [profileName, setProfileName] = useState('')
    const [profileJobTitle, setProfileJobTitle] = useState('')
    const [profileJoinDate, setProfileJoinDate] = useState('')
    const [savingProfile, setSavingProfile] = useState(false)
    const [profileSaved, setProfileSaved] = useState(false)
    const [profileError, setProfileError] = useState('')

    // Super Admin states
    const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null)
    const [orgMembers, setOrgMembers] = useState<Record<string, any[]>>({})
    const [loadingOrgMembers, setLoadingOrgMembers] = useState<string | null>(null)
    const [deleteOrgConfirm, setDeleteOrgConfirm] = useState<string | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
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

        if (!userData) return

        setUser(userData)
        setProfileName(userData.full_name || '')
        setProfileJobTitle(userData.job_title || '')
        setProfileJoinDate(userData.company_join_date || '')
        setIsSuperAdmin(SUPER_ADMIN_EMAILS.has(userData.email.toLowerCase()))
        setIsAdmin(userData?.role === 'admin' || userData?.role === 'super_admin')

        // Load organization
        if (userData.organization_id) {
            const { data: orgData } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', userData.organization_id)
                .single()

            setOrganization(orgData)

            // Load members with expanded fields
            const { data: membersData } = await supabase
                .from('users')
                .select('id, email, full_name, role, job_title, company_join_date, created_at')
                .eq('organization_id', userData.organization_id)

            setMembers(membersData || [])

            // Fetch report counts per member in parallel
            if (membersData && membersData.length > 0) {
                const counts: Record<string, number> = {}
                await Promise.all(
                    membersData.map(async (m: any) => {
                        const { count } = await supabase
                            .from('disease_reports')
                            .select('*', { count: 'exact', head: true })
                            .eq('created_by', m.id)
                        counts[m.id] = count || 0
                    })
                )
                setMemberReportCounts(counts)
            }
        }

        // Load all organizations for super admin
        if (userData.role === 'super_admin') {
            const { data: orgsData } = await supabase
                .from('organizations')
                .select('*, users!organizations_created_by_fkey(email)')
                .order('name')

            setAllOrgs(orgsData || [])
        }

        setLoading(false)
    }

    const handleSaveProfile = async () => {
        setSavingProfile(true)
        setProfileError('')

        const { error } = await supabase
            .from('users')
            .update({
                full_name: profileName,
                job_title: profileJobTitle || null,
                company_join_date: profileJoinDate || null,
            })
            .eq('id', user.id)

        if (error) {
            setProfileError('Failed to save changes. Please try again.')
        } else {
            setUser({ ...user, full_name: profileName, job_title: profileJobTitle, company_join_date: profileJoinDate })
            setProfileSaved(true)
            setTimeout(() => setProfileSaved(false), 3000)
        }
        setSavingProfile(false)
    }

    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault()
        setInviteError('')
        setInviting(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            const res = await fetch('/api/invitations/send', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: inviteEmail, job_title: inviteJobTitle }),
            })

            const data = await res.json()

            if (!res.ok) {
                setInviteError(data.error || 'Failed to send invitation')
                return
            }

            setInviteSuccess(true)
            setInviteEmail('')
            setInviteJobTitle('')
            setTimeout(() => {
                setInviteSuccess(false)
                setShowInviteModal(false)
            }, 2000)
        } catch {
            setInviteError('Failed to send invitation. Please try again.')
        } finally {
            setInviting(false)
        }
    }

    const copyShareCode = () => {
        if (organization?.share_code) {
            navigator.clipboard.writeText(organization.share_code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleChangeRole = async (userId: string, newRole: 'admin' | 'member') => {
        setChangingRole(userId)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            const response = await fetch('/api/admin/members/role', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId, newRole }),
            })

            const data = await response.json()

            if (!response.ok) {
                alert(data.error || 'Failed to update role')
                return
            }

            await loadSettings()
        } catch (error) {
            console.error('Role change error:', error)
            alert('Failed to update role')
        } finally {
            setChangingRole(null)
        }
    }

    const handleDeleteMember = async (userId: string) => {
        if (!organization?.id) return

        setDeleting(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            const response = await fetch('/api/admin/members/delete', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    userId,
                    organizationId: organization.id
                })
            })

            const data = await response.json()

            if (!response.ok) {
                alert(data.error || 'Failed to delete member')
                return
            }

            // Refresh members list
            await loadSettings()
            setDeleteConfirm(null)
            alert('Member deleted successfully!')
        } catch (error) {
            console.error('Delete error:', error)
            alert('Failed to delete member')
        } finally {
            setDeleting(false)
        }
    }

    // Super Admin Actions
    const handleExpandOrg = async (orgId: string) => {
        if (expandedOrgId === orgId) {
            setExpandedOrgId(null)
            return
        }

        setExpandedOrgId(orgId)

        if (!orgMembers[orgId]) {
            setLoadingOrgMembers(orgId)
            try {
                const { data } = await supabase
                    .from('users')
                    .select('id, email, full_name, role, created_at')
                    .eq('organization_id', orgId)

                setOrgMembers(prev => ({
                    ...prev,
                    [orgId]: data || []
                }))
            } catch (error) {
                console.error('Error loading org members:', error)
            } finally {
                setLoadingOrgMembers(null)
            }
        }
    }

    const handleDeleteOrg = async (orgId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            const response = await fetch('/api/admin/organizations/delete', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ organizationId: orgId })
            })

            if (!response.ok) throw new Error('Failed to delete organization')

            setDeleteOrgConfirm(null)
            setExpandedOrgId(null) // Collapse if open
            // Refresh list
            const { data: orgsData } = await supabase
                .from('organizations')
                .select('*, users!organizations_created_by_fkey(email)')
                .order('name')
            setAllOrgs(orgsData || [])

            alert('Organization deleted successfully')
        } catch (error) {
            console.error('Delete org error:', error)
            alert('Failed to delete organization')
        }
    }

    const handleDeleteOrgMember = async (userId: string, orgId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            const response = await fetch('/api/admin/members/delete', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId, organizationId: orgId })
            })

            if (!response.ok) throw new Error('Failed to delete member')

            // Refresh local state for this org
            const { data } = await supabase
                .from('users')
                .select('id, email, full_name, role, created_at')
                .eq('organization_id', orgId)

            setOrgMembers(prev => ({
                ...prev,
                [orgId]: data || []
            }))

            alert('Member removed successfully')
        } catch (error) {
            console.error('Error removing member:', error)
            alert('Failed to remove member')
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never'
        return new Date(dateString).toLocaleString()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    const tabs = [
        { id: 'profile', name: 'Profile', icon: User },
        { id: 'organization', name: 'Organization', icon: Building2 },
        { id: 'members', name: 'Members', icon: Users },
    ]

    if (isSuperAdmin) {
        tabs.push({ id: 'admin', name: 'Admin Panel', icon: SettingsIcon })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">Manage your account and organization settings</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => router.push(`/dashboard/settings?tab=${tab.id}`)}
                            className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm transition
                ${activeTab === tab.id
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
              `}
                        >
                            <tab.icon className="w-5 h-5 mr-2" />
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
                    <div className="space-y-4 max-w-lg">
                        {/* Email — read-only */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                readOnly
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        {/* Role — read-only */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                            <input
                                type="text"
                                value={user?.role || ''}
                                readOnly
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 capitalize cursor-not-allowed"
                            />
                        </div>
                        {/* Full Name — editable */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input
                                type="text"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                placeholder="Your full name"
                            />
                        </div>
                        {/* Job Title — editable dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                            <select
                                value={profileJobTitle}
                                onChange={(e) => setProfileJobTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            >
                                <option value="">Select a job title</option>
                                {JOB_TITLES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        {/* Company Join Date — editable */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Join Date</label>
                            <input
                                type="date"
                                value={profileJoinDate}
                                onChange={(e) => setProfileJoinDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            />
                        </div>

                        {/* Error / Success feedback */}
                        {profileError && (
                            <p className="text-sm text-red-600">{profileError}</p>
                        )}
                        {profileSaved && (
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                                <Check className="w-4 h-4" />
                                Profile updated successfully
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                onClick={handleSaveProfile}
                                disabled={savingProfile}
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                            >
                                {savingProfile ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Organization Tab */}
            {activeTab === 'organization' && organization && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Organization Details</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                            <input
                                type="text"
                                value={organization.name}
                                readOnly
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                value={organization.description || 'No description'}
                                readOnly
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Share Code</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={organization.share_code}
                                    readOnly
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono font-bold text-lg"
                                />
                                <button
                                    onClick={copyShareCode}
                                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                    title="Copy share code"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-gray-600" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Share this code with team members to invite them</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
                <>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Organization Members</h2>
                                <p className="text-sm text-gray-600 mt-1">{members.length} {members.length === 1 ? 'member' : 'members'}</p>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={() => { setShowInviteModal(true); setInviteError(''); setInviteSuccess(false) }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                                >
                                    <Mail className="w-4 h-4" />
                                    Invite Member
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports Made</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Join Date</th>
                                        {isAdmin && (
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {members.map((member) => (
                                        <tr key={member.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {member.full_name || 'N/A'}
                                                    {member.id === user?.id && (
                                                        <span className="ml-2 text-xs text-gray-500">(You)</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {member.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {member.job_title || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${member.role === 'admin'
                                                    ? 'bg-primary-100 text-primary-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {memberReportCounts[member.id] ?? '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {member.company_join_date
                                                    ? new Date(member.company_join_date).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Role toggle — super_admin only, not for self or other super_admins */}
                                                        {isSuperAdmin && member.id !== user?.id && member.role !== 'super_admin' && (
                                                            member.role === 'member' ? (
                                                                <button
                                                                    onClick={() => handleChangeRole(member.id, 'admin')}
                                                                    disabled={changingRole === member.id}
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition disabled:opacity-50"
                                                                >
                                                                    <Shield className="w-3.5 h-3.5" />
                                                                    {changingRole === member.id ? 'Saving...' : 'Make Admin'}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleChangeRole(member.id, 'member')}
                                                                    disabled={changingRole === member.id}
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
                                                                >
                                                                    <Shield className="w-3.5 h-3.5" />
                                                                    {changingRole === member.id ? 'Saving...' : 'Remove Admin'}
                                                                </button>
                                                            )
                                                        )}
                                                        {/* Delete — visible to admin+super_admin per permission rules */}
                                                        {member.id !== user?.id &&
                                                         member.role !== 'super_admin' &&
                                                         (isSuperAdmin || (isAdmin && member.role === 'member')) && (
                                                            <button
                                                                onClick={() => setDeleteConfirm(member.id)}
                                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition"
                                                                title="Delete Member"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Invite Member Modal */}
                    {showInviteModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary-100 rounded-lg">
                                            <Mail className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Invite Member</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowInviteModal(false)}
                                        className="p-1 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                                <form onSubmit={handleInviteMember}>
                                    <div className="p-6 space-y-4">
                                        {inviteError && (
                                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                                {inviteError}
                                            </div>
                                        )}
                                        {inviteSuccess && (
                                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                                <Check className="w-4 h-4" />
                                                Invitation sent successfully!
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
                                                placeholder="colleague@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                                            <select
                                                value={inviteJobTitle}
                                                onChange={(e) => setInviteJobTitle(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
                                            >
                                                <option value="">Select a job title (optional)</option>
                                                {JOB_TITLES.map((t) => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowInviteModal(false)}
                                            disabled={inviting}
                                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={inviting || inviteSuccess}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                        >
                                            <Mail className="w-4 h-4" />
                                            {inviting ? 'Sending...' : 'Send Invitation'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {deleteConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                                <div className="p-6 border-b border-gray-200 flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Delete Member</h3>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-600">
                                        This member's disease reports will be reassigned to Super Admin.
                                        Their account will be permanently deleted.
                                    </p>
                                    <p className="text-sm text-red-600 mt-2 font-medium">
                                        This action cannot be undone.
                                    </p>
                                </div>
                                <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        disabled={deleting}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMember(deleteConfirm!)}
                                        disabled={deleting}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {deleting ? 'Deleting...' : 'Delete Member'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Admin Panel Tab (Super Admin Only) */}
            {activeTab === 'admin' && isSuperAdmin && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">Super Admin Panel</h2>
                        <p className="text-sm text-gray-600 mt-1">All organizations in the system</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="w-10"></th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Organization Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Share Code
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created At
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {allOrgs.map((org) => (
                                    <Fragment key={org.id}>
                                        <tr className="hover:bg-gray-50 transition cursor-pointer" onClick={() => handleExpandOrg(org.id)}>
                                            <td className="px-6 py-4">
                                                {expandedOrgId === org.id ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{org.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-mono text-gray-900">{org.share_code}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{org.users?.email || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(org.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setDeleteOrgConfirm(org.id)
                                                    }}
                                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition"
                                                    title="Delete Organization"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedOrgId === org.id && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Organization Members</h4>
                                                        {loadingOrgMembers === org.id ? (
                                                            <div className="flex justify-center py-4">
                                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                                                            </div>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-sm">
                                                                    <thead>
                                                                        <tr className="text-gray-500 border-b border-gray-100">
                                                                            <th className="text-left font-medium py-2">Name</th>
                                                                            <th className="text-left font-medium py-2">Email</th>
                                                                            <th className="text-left font-medium py-2">Role</th>
                                                                            <th className="text-left font-medium py-2">Last Active</th>
                                                                            <th className="text-right font-medium py-2">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {orgMembers[org.id]?.map((member) => (
                                                                            <tr key={member.id} className="border-b border-gray-50 last:border-0">
                                                                                <td className="py-2">{member.users?.full_name || 'N/A'}</td>
                                                                                <td className="py-2">{member.users?.email}</td>
                                                                                <td className="py-2">
                                                                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">
                                                                                        {member.role}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-2 text-gray-500">
                                                                                    {formatDate(member.users?.last_sign_in_at)}
                                                                                </td>
                                                                                <td className="py-2 text-right">
                                                                                    <button
                                                                                        onClick={() => handleDeleteOrgMember(member.user_id, org.id)}
                                                                                        className="text-red-600 hover:text-red-800 text-xs px-2 py-1 hover:bg-red-50 rounded"
                                                                                    >
                                                                                        Remove
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                        {(!orgMembers[org.id] || orgMembers[org.id].length === 0) && (
                                                                            <tr>
                                                                                <td colSpan={5} className="text-center py-4 text-gray-500">
                                                                                    No members found
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Delete Org Confirmation Modal */}
            {deleteOrgConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Delete Organization</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600">
                                Are you sure you want to delete this organization?
                                This will remove all data associated with it, including members and reports.
                            </p>
                            <p className="text-sm text-red-600 mt-2 font-medium">
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteOrgConfirm(null)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteOrg(deleteOrgConfirm)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Delete Organization
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
