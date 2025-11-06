'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme } = useTheme()

  // Get theme colors with fallbacks
  const bottomNavColor = 'transparent' // Transparent bottom nav as requested
  const activeButtonColor = theme?.primary?.[600] || '#3B82F6'

  const navItems = [
    {
      name: 'Home',
      icon: '/assets/fi-rr-home.svg',
      path: '/dashboard',
      active: pathname === '/dashboard'
    },
    {
      name: 'Projects',
      icon: '/assets/fi-rr-briefcase.svg',
      path: '/dashboard/tasks/my-tasks',
      active: pathname.startsWith('/dashboard/tasks')
    },
    {
      name: 'Chat',
      icon: '/assets/fi-rr-comment.svg',
      path: '/dashboard/chat',
      active: pathname.startsWith('/dashboard/chat')
    },
    {
      name: 'Leave',
      icon: '/assets/fi-rr-calendar.svg',
      path: '/dashboard/leave',
      active: pathname.startsWith('/dashboard/leave')
    },
    {
      name: 'Ideas',
      icon: '/assets/fi-rr-bulb.svg',
      path: '/dashboard/sandbox',
      active: pathname.startsWith('/dashboard/sandbox')
    }
  ]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[40] md:hidden"
      style={{
        backgroundColor: bottomNavColor,
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div className="flex items-center justify-around py-2 px-4">

        {navItems.map((item) => {
          // Don't elevate chat button when active
          const isChat = item.name === 'Chat'
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`p-0 h-14 w-14 rounded-full transition-all duration-300 ${
                item.active && !isChat
                  ? '-translate-y-[34px]'
                  : item.active && isChat
                  ? ''
                  : 'text-gray-600'
              }`}
              style={{
                margin: 0,
                backgroundColor: item.active ? activeButtonColor : 'transparent',
                boxShadow: item.active && !isChat ? '0 0 0 10px var(--color-bg-main)' : 'none'
              }}
            >
              <img
                src={item.icon}
                width={24}
                height={24}
                className="transition-transform duration-300"
                style={{
                  filter: item.active ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.7)'
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

