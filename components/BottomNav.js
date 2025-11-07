'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext'
import UnreadBadge from './UnreadBadge'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentTheme, themes } = useTheme()
  const { unreadCount } = useUnreadMessages()

  // Get theme colors with fallbacks
  const bottomNavColor = '#FFFFFF' // White bottom nav
  const activeButtonColor = themes[currentTheme]?.primary?.[600] || '#3B82F6' // Active button uses theme color

  const navItems = [
    {
      name: 'Home',
      icon: '/assets/Bottom Bar/proicons_home.svg',
      path: '/dashboard',
      active: pathname === '/dashboard'
    },
    {
      name: 'Projects',
      icon: '/assets/Bottom Bar/Frame 69.svg',
      path: '/dashboard/tasks/my-tasks',
      active: pathname.startsWith('/dashboard/tasks')
    },
    {
      name: 'Chat',
      icon: '/assets/Bottom Bar/proicons_chat.svg',
      path: '/dashboard/chat',
      active: pathname.startsWith('/dashboard/chat')
    },
    {
      name: 'Leave',
      icon: '/assets/Bottom Bar/proicons_calendar.svg',
      path: '/dashboard/leave',
      active: pathname.startsWith('/dashboard/leave')
    },
    {
      name: 'Ideas',
      icon: '/assets/Bottom Bar/proicons_lightbulb.svg',
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
        borderTop: '1px solid rgba(0, 0, 0, 0.1)' // Subtle gray border for white background
      }}
    >
      <div className="flex items-center justify-around py-2 px-4">

        {navItems.map((item) => {
          // Don't elevate chat button when active
          const isChat = item.name === 'Chat'
          return (
            <div key={item.path} className="relative">
              <button
                onClick={() => router.push(item.path)}
                className={`relative p-0 h-14 w-14 rounded-full transition-all duration-300 ${
                  isChat ? 'border-[1px] border-slate-300' : ''
                } ${
                  item.active && !isChat
                    ? '-translate-y-[34px]'
                    : item.active && isChat
                    ? ''
                    : 'text-gray-600'
                }`}
                style={{
                  margin: 0,
                  backgroundColor: item.active ? activeButtonColor : 'transparent',
                  boxShadow: item.active && !isChat ? '0 0 0 10px var(--color-bg-main)' : 'none' // Use opaque bg color for shadow ring
                }}
              >
                <img
                  src={item.icon}
                  width={24}
                  height={24}
                  className="transition-transform duration-300"
                  style={{
                    filter: item.active
                      ? 'brightness(0) invert(1)' // White icon for active (on colored background)
                      : 'brightness(0) saturate(100%) invert(44%) sepia(8%) saturate(400%) hue-rotate(180deg)' // Gray icon for inactive
                  }}
                />
              </button>
              {isChat && unreadCount > 0 && (
                <UnreadBadge count={unreadCount} className="top-0 right-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

