'use client'

import { usePathname, useRouter } from 'next/navigation'
import { FaHome, FaTasks, FaComments, FaCalendarAlt, FaLightbulb } from 'react-icons/fa'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      name: 'Home',
      icon: FaHome,
      path: '/dashboard',
      active: pathname === '/dashboard'
    },
    {
      name: 'Tasks',
      icon: FaTasks,
      path: '/dashboard/tasks/my-tasks',
      active: pathname.startsWith('/dashboard/tasks')
    },
    {
      name: 'Chat',
      icon: FaComments,
      path: '/dashboard/chat',
      active: pathname.startsWith('/dashboard/chat')
    },
    {
      name: 'Leave',
      icon: FaCalendarAlt,
      path: '/dashboard/leave',
      active: pathname.startsWith('/dashboard/leave')
    },
    {
      name: 'Ideas',
      icon: FaLightbulb,
      path: '/dashboard/sandbox',
      active: pathname.startsWith('/dashboard/sandbox')
    }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex items-center justify-center flex-1 h-full transition-colors ${
                item.active
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`text-2xl ${item.active ? 'text-blue-600' : 'text-gray-500'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

