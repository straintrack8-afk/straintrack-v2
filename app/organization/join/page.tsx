'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function JoinOrganizationPage() {
    const router = useRouter()
    const supabase = createClient()

    const [shareCode, setShareCode] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Validate share code length
            if (shareCode.length !== 8) {
                throw new Error('Share code must be 8 characters')
            }

            // Call RPC function to join organization
            const { data, error: rpcError } = await supabase
                .rpc('join_organization', {
                    share_code: shareCode.toUpperCase(),
                })

            if (rpcError) throw rpcError

            if (data && data.length > 0) {
                const result = data[0]
                if (result.success) {
                    // Successfully joined, redirect to dashboard
                    router.push('/dashboard')
                } else {
                    throw new Error(result.message || 'Failed to join organization')
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to join organization')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <Link
                        href="/onboarding"
                        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Link>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Join Organization</h1>
                        <p className="text-gray-600 mt-2">Enter the share code provided by your organization</p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="shareCode" className="block text-sm font-medium text-gray-700 mb-2">
                                Share Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="shareCode"
                                type="text"
                                value={shareCode}
                                onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                                required
                                maxLength={8}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-center text-2xl font-bold tracking-wider uppercase"
                                placeholder="XXXXXXXX"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Enter the 8-character code shared by your organization admin
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || shareCode.length !== 8}
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Joining...' : 'Join Organization'}
                        </button>
                    </form>

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Don't have a share code?</strong> Ask your organization administrator to provide you with the 8-character share code.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
