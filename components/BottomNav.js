'use client'

import { usePathname, useRouter } from 'next/navigation'
import { FaHome, FaTasks, FaComments, FaCalendarAlt, FaLightbulb } from 'react-icons/fa'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      name: 'Home',
      icon: '/assets/fi-rr-home.svg',
      path: '/dashboard',
      active: pathname === '/dashboard'
    },
    {
      name: 'Projects',
      icon: '/assets/fi-rr-chart-pie-alt.svg',
      path: '/dashboard/tasks/my-tasks',
      active: pathname.startsWith('/dashboard/tasks')
    },
    {
      name: 'Chat',
      icon: '/assets/fi-rr-clock.svg',
      path: '/dashboard/chat',
      active: pathname.startsWith('/dashboard/chat')
    },
    {
      name: 'Leave',
      icon: '/assets/fi-rr-clock.svg',
      path: '/dashboard/leave',
      active: pathname.startsWith('/dashboard/leave')
    },
    {
      name: 'Ideas',
      icon:'/assets/fi-rr-home.svg',
      path: '/dashboard/sandbox',
      active: pathname.startsWith('/dashboard/sandbox')
    }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1A2A5A] z-[40] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around py-2 px-4">
      
        {navItems.map((item) => {
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`p-0 h-14 w-14 rounded-full transition-all duration-300 ${
                item.active
                  ? 'bg-[#7FBEB0] -translate-y-[34px] shadow-[0_0px_0_10px_#F9FAFB]'
                  : 'text-gray-600'
              }`}
              style={{ margin: 0 }}
            >
              <img src={item.icon} width={24} height={24} className="transition-transform duration-300" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

