'use client'

import { useState, useEffect } from 'react'
import { FaCalendarAlt, FaGift } from 'react-icons/fa'

export default function HolidaysWidget({ limit = 5 }) {
    const [holidays, setHolidays] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchHolidays()
    }, [])

    const fetchHolidays = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/holidays?limit=${limit}&upcoming=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setHolidays(data.data || [])
            }
        } catch (error) {
            console.error('Fetch holidays error:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const getDaysUntil = (dateStr) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const holidayDate = new Date(dateStr)
        holidayDate.setHours(0, 0, 0, 0)
        const diffTime = holidayDate - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    if (loading) {
        return (
            <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {holidays.length > 0 ? (
                holidays.map((holiday, index) => {
                    const daysUntil = getDaysUntil(holiday.date)
                    return (
                        <div
                            key={holiday._id || index}
                            className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <FaGift className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{holiday.name}</p>
                                    <p className="text-xs text-gray-500">{formatDate(holiday.date)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                {daysUntil === 0 ? (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">Today!</span>
                                ) : daysUntil === 1 ? (
                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full font-medium">Tomorrow</span>
                                ) : daysUntil > 0 ? (
                                    <span className="text-xs text-gray-500">{daysUntil} days</span>
                                ) : (
                                    <span className="text-xs text-gray-400">Passed</span>
                                )}
                            </div>
                        </div>
                    )
                })
            ) : (
                <div className="text-center py-6 text-gray-500">
                    <FaCalendarAlt className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No upcoming holidays</p>
                </div>
            )}
        </div>
    )
}
