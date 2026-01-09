import { format } from 'date-fns'

// Simple class name concatenation utility
export function cn(...inputs: (string | undefined | null | false)[]) {
    return inputs.filter(Boolean).join(' ')
}

export function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export function formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function calculateMorbidityRate(sickCount: number, totalPopulation: number): number {
    if (totalPopulation === 0) return 0
    return Number(((sickCount / totalPopulation) * 100).toFixed(2))
}

export function calculateMortalityRate(deathCount: number, totalPopulation: number): number {
    if (totalPopulation === 0) return 0
    return Number(((deathCount / totalPopulation) * 100).toFixed(2))
}
