'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Building2, Users } from 'lucide-react'

export default function OnboardingPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/login')
                return
            }

            // Check if user already has organization
            const { data: userData } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', session.user.id)
                .single()

            if (userData?.organization_id) {
                // User already has organization, redirect to dashboard
                router.push('/dashboard')
            } else {
                setLoading(false)
            }
        }

        checkUser()
    }, [router, supabase])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center mb-6">
                        <Image
                            src="/Logo 2.png"
                            alt="StrainTrack Logo"
                            width={252}
                            height={252}
                            className="object-contain"
                        />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to StrainTrack!</h1>
                    <p className="text-xl text-gray-600">Let's get you set up. Choose an option below:</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    {/* Create Organization */}
                    <button
                        onClick={() => router.push('/organization/create')}
                        className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 text-center group"
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-6 group-hover:bg-primary-700 transition">
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Create Organization</h2>
                        <p className="text-gray-600 mb-6">
                            Start a new organization and invite your team members to collaborate on disease surveillance.
                        </p>
                        <div className="text-primary-600 font-semibold group-hover:text-primary-700">
                            Get Started →
                        </div>
                    </button>

                    {/* Join Organization */}
                    <button
                        onClick={() => router.push('/organization/join')}
                        className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1 text-center group"
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-6 group-hover:bg-green-700 transition">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Join Organization</h2>
                        <p className="text-gray-600 mb-6">
                            Have a share code? Join an existing organization and start collaborating with your team.
                        </p>
                        <div className="text-green-600 font-semibold group-hover:text-green-700">
                            Join Now →
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}
