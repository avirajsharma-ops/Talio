'use client'

import { useState, useEffect, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

const STORAGE_KEY = 'dashboard_section_order'

/**
 * Custom hook to manage draggable dashboard section layout
 * Persists the order to localStorage for user preference retention
 */
export function useDashboardSectionLayout(defaultSections, userId = 'default') {
    const [orderedSections, setOrderedSections] = useState(defaultSections)
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

                // Reorder sections based on saved order (by id)
                const reorderedSections = []
                const sectionsMap = new Map(defaultSections.map(section => [section.id, section]))

                // Add sections in saved order
                parsedOrder.forEach(id => {
                    if (sectionsMap.has(id)) {
                        reorderedSections.push(sectionsMap.get(id))
                        sectionsMap.delete(id)
                    }
                })

                // Add any new sections that weren't in saved order (at the end)
                sectionsMap.forEach(section => {
                    reorderedSections.push(section)
                })

                setOrderedSections(reorderedSections)
            } else {
                setOrderedSections(defaultSections)
            }
        } catch (error) {
            console.error('Error loading dashboard section layout:', error)
            setOrderedSections(defaultSections)
        }

        setIsInitialized(true)
    }, [storageKey])

    // Update sections when defaultSections change (but not order)
    useEffect(() => {
        if (!isInitialized) return

        // Update content while preserving order
        setOrderedSections(prev => {
            const sectionsMap = new Map(defaultSections.map(section => [section.id, section]))
            return prev.map(section => sectionsMap.get(section.id) || section).filter(Boolean)
        })
    }, [defaultSections, isInitialized])

    // Save order to localStorage
    const saveOrder = useCallback((sections) => {
        if (typeof window === 'undefined') return

        try {
            const order = sections.map(section => section.id)
            localStorage.setItem(storageKey, JSON.stringify(order))
        } catch (error) {
            console.error('Error saving dashboard section layout:', error)
        }
    }, [storageKey])

    // Handle drag end event
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setOrderedSections(prevSections => {
                const oldIndex = prevSections.findIndex(section => section.id === active.id)
                const newIndex = prevSections.findIndex(section => section.id === over.id)

                const newOrder = arrayMove(prevSections, oldIndex, newIndex)
                saveOrder(newOrder)

                return newOrder
            })
        }
    }, [saveOrder])

    // Reset to default order
    const resetOrder = useCallback(() => {
        setOrderedSections(defaultSections)
        if (typeof window !== 'undefined') {
            localStorage.removeItem(storageKey)
        }
    }, [defaultSections, storageKey])

    return {
        orderedSections,
        handleDragEnd,
        resetOrder,
        isInitialized,
    }
}

export default useDashboardSectionLayout
