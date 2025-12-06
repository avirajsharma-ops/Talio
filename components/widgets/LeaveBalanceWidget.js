'use client'

import { useState, useEffect } from 'react'
import { FaCalendarAlt } from 'react-icons/fa'

export default function LeaveBalanceWidget({ employeeId }) {
    const [balances, setBalances] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (employeeId) {
            fetchLeaveBalance()
        }
    }, [employeeId])

    const fetchLeaveBalance = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/leave/balance?employeeId=${employeeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setBalances(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching leave balance:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="p-4 sm:p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        )
    }

    const colorClasses = [
        'bg-blue-50 text-blue-700 border-blue-200',
        'bg-green-50 text-green-700 border-green-200',
        'bg-purple-50 text-purple-700 border-purple-200',
        'bg-orange-50 text-orange-700 border-orange-200',
        'bg-pink-50 text-pink-700 border-pink-200',
    ]

    return (
        <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
                <FaCalendarAlt className="w-5 h-5 text-primary-500" />
                <h3 className="text-base sm:text-lg font-bold text-gray-800">Leave Balance</h3>
            </div>

            {balances.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No leave balance data</p>
            ) : (
                <div className="space-y-3">
                    {balances.map((balance, index) => (
                        <div
                            key={balance._id || index}
                            className={`p-3 rounded-lg border ${colorClasses[index % colorClasses.length]}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{balance.leaveType?.name || 'Leave'}</span>
                                <span className="text-lg font-bold">{balance.remaining || 0} days</span>
                            </div>
                            <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-current opacity-60 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, ((balance.used || 0) / (balance.total || 1)) * 100)}%`
                                    }}
                                />
                            </div>
                            <div className="flex justify-between mt-1 text-xs opacity-75">
                                <span>Used: {balance.used || 0}</span>
                                <span>Total: {balance.total || 0}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
