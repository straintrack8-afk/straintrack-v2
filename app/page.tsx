'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session) {
                // User is logged in, redirect to dashboard
                router.push('/dashboard')
            } else {
                // User is not logged in, redirect to welcome page
                router.push('/welcome')
            }
        }

        checkAuth()
    }, [router, supabase])

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    )
}
