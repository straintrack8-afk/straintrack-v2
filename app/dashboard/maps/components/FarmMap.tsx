'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface FarmMarker {
    id: string
    name: string
    location: string
    latitude: number
    longitude: number
    reportCount: number
    highestSeverity: string
    disease: string
    strain: string
}

interface FarmMapProps {
    farms: FarmMarker[]
}

export default function FarmMap({ farms }: FarmMapProps) {
    const mapRef = useRef<L.Map | null>(null)
    const mapContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!mapContainerRef.current) return

        // Initialize map only once
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([16.0, 106.0], 6)

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapRef.current)
        }

        const map = mapRef.current

        // Clear existing markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer)
            }
        })

        // Add markers for each farm
        if (farms.length > 0) {
            const bounds: L.LatLngExpression[] = []

            farms.forEach((farm) => {
                const color = farm.highestSeverity === 'High' || farm.highestSeverity === 'Critical' ? '#ef4444' :
                    farm.highestSeverity === 'Medium' ? '#f97316' : '#22c55e'

                const icon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                    popupAnchor: [0, -12]
                })

                const marker = L.marker([farm.latitude, farm.longitude], { icon })
                    .bindPopup(`
                        <div style="padding: 8px; min-width: 200px;">
                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px; line-height: 1.4;">
                                ${farm.location}
                            </div>
                            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; space-y: 4px;">
                                <div style="margin-bottom: 6px;">
                                    <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Disease</div>
                                    <div style="font-size: 14px; font-weight: 500; color: #111827;">${farm.disease}</div>
                                </div>
                                <div style="margin-bottom: 6px;">
                                    <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Strain</div>
                                    <div style="font-size: 14px; font-weight: 500; color: #111827;">${farm.strain}</div>
                                </div>
                                <div>
                                    <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Severity</div>
                                    <span style="display: inline-block; margin-top: 4px; font-size: 12px; padding: 4px 10px; border-radius: 9999px; font-weight: 500; background-color: ${farm.highestSeverity === 'High' || farm.highestSeverity === 'Critical' ? '#fee2e2' :
                            farm.highestSeverity === 'Medium' ? '#ffedd5' : '#dcfce7'
                        }; color: ${farm.highestSeverity === 'High' || farm.highestSeverity === 'Critical' ? '#991b1b' :
                            farm.highestSeverity === 'Medium' ? '#9a3412' : '#166534'
                        };">
                                        ${farm.highestSeverity}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `)
                    .addTo(map)

                bounds.push([farm.latitude, farm.longitude])
            })

            // Fit map to show all markers
            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50] })
            }
        }

        // Cleanup function
        return () => {
            // Don't destroy map on cleanup, just clear markers
        }
    }, [farms])

    // Cleanup map on unmount
    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
        }
    }, [])

    return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
}
