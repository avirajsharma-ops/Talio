'use client'

import { useState, useEffect, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

const STORAGE_KEY = 'dashboard_kpi_order'

/**
 * Custom hook to manage draggable dashboard KPI card layout
 * Persists the order to localStorage for user preference retention
 */
export function useDashboardLayout(defaultStats, userId = 'default') {
    const [orderedStats, setOrderedStats] = useState(defaultStats)
    const [isInitialized, setIsInitialized] = useState(false)

    // Generate unique storage key per user
    const storageKey = `${STORAGE_KEY}_${userId}`

    // Load saved order from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return

        try {
            const savedOrder = localStorage.getItem(storageKey)
            if (savedOrder) {
                const parsedOrder = JSON.parse(savedOrder)

                // Reorder stats based on saved order (by title as unique identifier)
                const reorderedStats = []
                const statsMap = new Map(defaultStats.map(stat => [stat.title, stat]))

                // Add stats in saved order
                parsedOrder.forEach(title => {
                    if (statsMap.has(title)) {
                        reorderedStats.push(statsMap.get(title))
                        statsMap.delete(title)
                    }
                })

                // Add any new stats that weren't in saved order (at the end)
                statsMap.forEach(stat => {
                    reorderedStats.push(stat)
                })

                setOrderedStats(reorderedStats)
            } else {
                setOrderedStats(defaultStats)
            }
        } catch (error) {
            console.error('Error loading dashboard layout:', error)
            setOrderedStats(defaultStats)
        }

        setIsInitialized(true)
    }, [storageKey, defaultStats.length])

    // Update stats when defaultStats values change (but not order)
    useEffect(() => {
        if (!isInitialized) return

        // Update values while preserving order
        setOrderedStats(prev => {
            const statsMap = new Map(defaultStats.map(stat => [stat.title, stat]))
            return prev.map(stat => statsMap.get(stat.title) || stat)
        })
    }, [defaultStats, isInitialized])

    // Save order to localStorage
    const saveOrder = useCallback((stats) => {
        if (typeof window === 'undefined') return

        try {
            const order = stats.map(stat => stat.title)
            localStorage.setItem(storageKey, JSON.stringify(order))
        } catch (error) {
            console.error('Error saving dashboard layout:', error)
        }
    }, [storageKey])

    // Handle drag end event
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setOrderedStats(prevStats => {
                const oldIndex = prevStats.findIndex(stat => stat.title === active.id)
                const newIndex = prevStats.findIndex(stat => stat.title === over.id)

                const newOrder = arrayMove(prevStats, oldIndex, newIndex)
                saveOrder(newOrder)

                return newOrder
            })
        }
    }, [saveOrder])

    // Reset to default order
    const resetOrder = useCallback(() => {
        setOrderedStats(defaultStats)
        if (typeof window !== 'undefined') {
            localStorage.removeItem(storageKey)
        }
    }, [defaultStats, storageKey])

    return {
        orderedStats,
        handleDragEnd,
        resetOrder,
        isInitialized,
    }
}

export default useDashboardLayout
