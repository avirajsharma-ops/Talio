'use client'

import { useTheme } from '@/contexts/ThemeContext'

export default function UnreadBadge({ count, className = '' }) {
  const { currentTheme, themes } = useTheme()
  const theme = themes[currentTheme] || themes.default

  if (!count || count === 0) return null

  // Format count (show 99+ for counts over 99)
  const displayCount = count > 99 ? '99+' : count

  return (
    <span
      className={`absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 text-white text-xs font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md ring-2 ring-white ${className}`}
      style={{
        fontSize: '9px',
        backgroundColor: theme.primary[600],
        zIndex: 50,
        pointerEvents: 'none'
      }}
    >
      {displayCount}
    </span>
  )
}

