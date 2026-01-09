'use client'

import { createContext, useContext, ReactNode } from 'react'
import { OrganizationWithRole } from '@/lib/types'

interface OrganizationContextType {
    activeOrg: OrganizationWithRole | null
    organizations: OrganizationWithRole[]
    isSuperAdmin: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

interface OrganizationProviderProps {
    children: ReactNode
    activeOrg: OrganizationWithRole | null
    organizations: OrganizationWithRole[]
    isSuperAdmin: boolean
}

export function OrganizationProvider({
    children,
    activeOrg,
    organizations,
    isSuperAdmin
}: OrganizationProviderProps) {
    return (
        <OrganizationContext.Provider
            value={{
                activeOrg,
                organizations,
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
