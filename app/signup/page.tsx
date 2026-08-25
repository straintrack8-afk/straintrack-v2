'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, AlertCircle } from 'lucide-react'

const JOB_TITLES = ['Technical', 'Sales', 'Manager', 'Veterinarian', 'Other']

function SignupForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [invitation, setInvitation] = useState<any>(null)
    const [invitationError, setInvitationError] = useState('')
    const [checkingInvite, setCheckingInvite] = useState(true)

    const [fullName, setFullName] = useState('')
    const [jobTitle, setJobTitle] = useState('')
    const [companyJoinDate, setCompanyJoinDate] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const invitationId = searchParams.get('invitation')

        if (!invitationId) {
            router.replace('/login')
            return
        }

        const checkInvitation = async () => {
            const { data } = await supabase
                .from('organization_invitations')
                .select('id, email, organization_id, status, expires_at, job_title')
                .eq('id', invitationId)
                .eq('status', 'pending')
                .gt('expires_at', new Date().toISOString())
                .maybeSingle()

            if (!data) {
                setInvitationError(
                    'This invitation link is invalid or has expired. Contact your administrator.'
                )
            } else {
                setInvitation(data)
                if (data.job_title) setJobTitle(data.job_title)
            }
            setCheckingInvite(false)
        }

        checkInvitation()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        setLoading(true)

        try {
            // 1. Create auth account
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: invitation.email,
                password,
                options: {
                    data: { full_name: fullName },
                },
            })

            if (signUpError) throw signUpError
            if (!authData.user) throw new Error('Failed to create account')

            // 2. Update public.users (created by handle_new_user trigger)
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    full_name: fullName,
                    job_title: jobTitle || null,
                    company_join_date: companyJoinDate || null,
                    organization_id: invitation.organization_id,
                    role: 'member',
                })
                .eq('id', authData.user.id)

            if (updateError) {
                console.error('User update error:', updateError)
            }

            // 3. Mark invitation as accepted
            await supabase
                .from('organization_invitations')
                .update({ status: 'accepted' })
                .eq('id', invitation.id)

            // 4. Redirect to dashboard
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    if (checkingInvite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    if (invitationError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">Invitation Invalid</h1>
                        <p className="text-gray-600 text-sm leading-relaxed mb-6">{invitationError}</p>
                        <Link
                            href="/login"
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            ← Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
                            <UserPlus className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                        <p className="text-gray-600 mt-2 text-sm">Complete your StrainTrack registration</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Email — read-only from invitation */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={invitation?.email || ''}
                                readOnly
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                placeholder="Your full name"
                            />
                        </div>

                        {/* Job Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Job Title <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            >
                                <option value="">Select a job title</option>
                                {JOB_TITLES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Company Join Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Company Join Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={companyJoinDate}
                                onChange={(e) => setCompanyJoinDate(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                placeholder="Min. 8 characters"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                placeholder="Repeat your password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        }>
            <SignupForm />
        </Suspense>
    )
}
