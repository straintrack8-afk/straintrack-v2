import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Shield, BarChart3, Globe } from 'lucide-react'

export default function WelcomePage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="absolute top-0 left-0 right-0 p-6">
                <div className="max-w-7xl mx-auto flex justify-end">
                    <Link
                        href="/login"
                        className="text-primary-600 hover:text-primary-700 font-medium transition"
                    >
                        Already have an account?
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="min-h-screen flex items-center justify-center px-4 pt-4">
                <div className="max-w-6xl mx-auto text-center">
                    {/* Logo & Title */}
                    <div className="mb-12">
                        <div className="inline-flex items-center justify-center mb-3">
                            <Image
                                src="/Logo 2.png"
                                alt="StrainTrack Logo"
                                width={270}
                                height={270}
                                className="object-contain"
                            />
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-3">
                            Welcome to <span className="text-primary-600">StrainTrack</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                            Comprehensive Disease Surveillance System
                        </p>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
                        <div className="bg-primary-50 rounded-xl p-6 border border-primary-100">
                            <Shield className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Compliant</h3>
                            <p className="text-gray-600 text-sm">Multi-tenant architecture with role-based access control</p>
                        </div>
                        <div className="bg-primary-50 rounded-xl p-6 border border-primary-100">
                            <BarChart3 className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
                            <p className="text-gray-600 text-sm">Track disease outbreaks and trends across your farms</p>
                        </div>
                        <div className="bg-primary-50 rounded-xl p-6 border border-primary-100">
                            <Globe className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Collaborative</h3>
                            <p className="text-gray-600 text-sm">Share data across your organization seamlessly</p>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            href="/signup"
                            className="group px-8 py-4 bg-primary-600 text-white rounded-xl font-semibold text-lg hover:bg-primary-700 transition shadow-lg hover:shadow-xl flex items-center"
                        >
                            Create Account
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
                        </Link>
                        <Link
                            href="/login"
                            className="px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold text-lg hover:bg-gray-50 transition border-2 border-primary-600"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-center text-gray-500 text-sm border-t border-gray-100">
                <p>&copy; 2026 StrainTrack. All rights reserved.</p>
            </div>
        </div>
    )
}
