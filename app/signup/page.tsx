'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Shield, AlertCircle } from 'lucide-react'

function SignupForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const invitationId = searchParams.get('invitation')

    const [invitation, setInvitation] = useState<any>(null)
    const [checkingInvitation, setCheckingInvitation] = useState(true)
    const [invitationError, setInvitationError] = useState('')

    const [fullName, setFullName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!invitationId) {
            router.push('/login')
            return
        }

        const checkInvitation = async () => {
            const { data, error } = await supabase
                .from('organization_invitations')
                .select('*')
                .eq('id', invitationId)
                .eq('status', 'pending')
                .single()

            if (error || !data) {
                setInvitationError('This invitation link is invalid or has expired.')
                setCheckingInvitation(false)
                return
            }

            const now = new Date()
            const expiresAt = new Date(data.expires_at)
            if (expiresAt <= now) {
                setInvitationError('This invitation link is invalid or has expired.')
                setCheckingInvitation(false)
                return
            }

            setInvitation(data)
            setCheckingInvitation(false)
        }

        checkInvitation()
    }, [invitationId])

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!fullName.trim()) {
            setError('Full name is required')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: invitation.email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Failed to create account')

            // Explicit sign in to ensure session is valid
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: invitation.email,
                password
            })

            if (signInError) {
                setError('Account created but could not sign in. Please login manually.')
                router.push('/login')
                return
            }

            // Get session token for the API call
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            // Complete signup: update public.users with org_id, role, full_name
            const response = await fetch('/api/auth/complete-signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: authData.user.id,
                    fullName,
                    organizationId: invitation.organization_id
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to complete signup')
            }

            // Mark invitation as accepted
            await supabase
                .from('organization_invitations')
                .update({ status: 'accepted' })
                .eq('id', invitation.id)

            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    if (checkingInvitation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Verifying invitation...</p>
                    </div>
                </div>
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
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
                        <p className="text-gray-600 mb-6">{invitationError}</p>
                        <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center mb-4">
                            <Image
                                src="/Logo 2.png"
                                alt="StrainTrack Logo"
                                width={192}
                                height={192}
                                className="object-contain"
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                        <p className="text-gray-600 mt-2">Join StrainTrack disease surveillance system</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSignup} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={invitation?.email || ''}
                                readOnly
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                placeholder="••••••••"
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

                    {/* Footer */}
                    <div className="mt-6">
                        <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                            <Shield className="w-4 h-4 mr-1" />
                            <span>Your data is secure and encrypted</span>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-600">
                                Already have an account?{' '}
                                <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading...</p>
                    </div>
                </div>
            </div>
        }>
            <SignupForm />
        </Suspense>
    )
}
