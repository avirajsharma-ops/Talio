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

  // Check if current page is a bottom nav page (for showing the elevated button ring)
  const isBottomNavPage = 
    pathname === '/dashboard' || 
    pathname.startsWith('/dashboard/projects') || 
    pathname.startsWith('/dashboard/leave') ||
    pathname.startsWith('/dashboard/sandbox')

  // Only show the ring shadow on bottom nav pages (excluding chat)
  const shouldShowRing = isBottomNavPage && !pathname.startsWith('/dashboard/chat')

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
      path: '/dashboard/projects/my-tasks',
      active: pathname.startsWith('/dashboard/projects')
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
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingTop: '12px',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)' // Subtle gray border for white background
      }}
    >
      <div className="flex items-center justify-between px-3 gap-1">

        {navItems.map((item) => {
          // Don't elevate chat button when active
          const isChat = item.name === 'Chat'
          return (
            <div key={item.path} className="relative flex-1 flex justify-center">
              <button
                onClick={() => router.push(item.path)}
                className={`relative p-0 h-12 w-12 rounded-full flex items-center justify-center ${
                  isChat ? 'border-[1px] border-slate-300' : ''
                } ${
                  item.active && !isChat
                    ? '-translate-y-[24px]'
                    : item.active && isChat
                    ? ''
                    : 'text-gray-600'
                }`}
                style={{
                  margin: 0,
                  backgroundColor: item.active ? activeButtonColor : 'transparent',
                  boxShadow: item.active && !isChat && shouldShowRing ? '0 0 0 10px var(--color-bg-main)' : 'none',
                  opacity: 1,
                  transition: 'background-color 0.6s ease-in-out, box-shadow 0.6s ease-in-out, border-color 0.6s ease-in-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease-in-out'
                }}
              >
                <img
                  src={item.icon}
                  width={24}
                  height={24}
                  style={{
                    filter: item.active
                      ? 'brightness(0) invert(1)' // White icon for active (on colored background)
                      : 'brightness(0) saturate(100%) invert(44%) sepia(8%) saturate(400%) hue-rotate(180deg)', // Gray icon for inactive
                    transition: 'filter 0.6s ease-in-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: item.active ? 'scale(1.1)' : 'scale(1)'
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

