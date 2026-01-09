'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, ArrowLeft, Copy, Check } from 'lucide-react'
import Link from 'next/link'

export default function CreateOrganizationPage() {
    const router = useRouter()
    const supabase = createClient()

    const [orgName, setOrgName] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [shareCode, setShareCode] = useState('')
    const [copied, setCopied] = useState(false)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Call RPC function to create organization
            const { data, error: rpcError } = await supabase
                .rpc('create_organization', {
                    org_name: orgName,
                    org_description: description || null,
                })

            if (rpcError) throw rpcError

            if (data && data.length > 0) {
                setShareCode(data[0].org_share_code)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create organization')
            setLoading(false)
        }
    }

    const copyShareCode = () => {
        navigator.clipboard.writeText(shareCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (shareCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                                <Check className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">Organization Created!</h1>
                            <p className="text-gray-600 mt-2">Your organization has been successfully created</p>
                        </div>

                        <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 mb-6">
                            <p className="text-sm text-gray-600 mb-2">Share this code with your team:</p>
                            <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-primary-300">
                                <span className="text-2xl font-bold text-primary-600 tracking-wider">{shareCode}</span>
                                <button
                                    onClick={copyShareCode}
                                    className="ml-4 p-2 hover:bg-primary-100 rounded-lg transition"
                                    title="Copy to clipboard"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-primary-600" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Team members can use this code to join your organization
                            </p>
                        </div>

                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        )
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
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Organization</h1>
                        <p className="text-gray-600 mt-2">Set up your disease surveillance organization</p>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                                Organization Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="orgName"
                                type="text"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                placeholder="e.g., Veterinary Services Center"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description (Optional)
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none"
                                placeholder="Brief description of your organization..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create Organization'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
