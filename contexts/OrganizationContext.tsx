'use client'

import { createContext, useContext, ReactNode } from 'react'
import { OrganizationWithRole } from '@/lib/types'

interface OrganizationContextType {
    activeOrg: OrganizationWithRole | null
    isSuperAdmin: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

interface OrganizationProviderProps {
    children: ReactNode
    activeOrg: OrganizationWithRole | null
    isSuperAdmin: boolean
}

export function OrganizationProvider({
    children,
    activeOrg,
    isSuperAdmin
}: OrganizationProviderProps) {
    return (
        <OrganizationContext.Provider
            value={{
                activeOrg,
                isSuperAdmin
            }}
        >
            {children}
        </OrganizationContext.Provider>
    )
}

export function useOrganization() {
    const context = useContext(OrganizationContext)
    if (context === undefined) {
        throw new Error('useOrganization must be used within OrganizationProvider')
    }
    return context
}
