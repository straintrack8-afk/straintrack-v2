import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'StrainTrack - Disease Surveillance System',
    description: 'Multi-tenant disease surveillance system for veterinary organizations',
    manifest: '/manifest.json',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    themeColor: '#2563eb',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'StrainTrack',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    )
}
