'use client'

import { useRouter } from 'next/navigation'
import { FaUser, FaCalendar, FaDollarSign, FaTasks, FaFileAlt, FaPlane } from 'react-icons/fa'

export default function QuickActionsWidget() {
    const router = useRouter()

    const actions = [
        { icon: FaCalendar, label: 'Request Leave', path: '/dashboard/leave/requests', color: 'bg-blue-500' },
        { icon: FaTasks, label: 'My Tasks', path: '/dashboard/projects', color: 'bg-green-500' },
        { icon: FaDollarSign, label: 'Payroll', path: '/dashboard/payroll', color: 'bg-purple-500' },
        { icon: FaPlane, label: 'Travel Request', path: '/dashboard/travel', color: 'bg-orange-500' },
        { icon: FaFileAlt, label: 'Documents', path: '/dashboard/documents', color: 'bg-teal-500' },
        { icon: FaUser, label: 'My Profile', path: '/dashboard/profile', color: 'bg-indigo-500' },
    ]

    return (
        <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-3">
                {actions.map((action, index) => {
                    const Icon = action.icon
                    return (
                        <button
                            key={index}
                            onClick={() => router.push(action.path)}
                            className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center gap-2 text-center"
                        >
                            <div className={`${action.color} w-10 h-10 rounded-full flex items-center justify-center`}>
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs font-medium text-gray-700">{action.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
