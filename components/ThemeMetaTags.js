'use client'

import { useEffect } from 'react'
import { useTheme, themes } from '@/contexts/ThemeContext'

export default function ThemeMetaTags() {
  const { currentTheme } = useTheme()

  useEffect(() => {
    const theme = themes[currentTheme]
    if (!theme) return

    // Bottom navigation bar color - fixed to #192A5A
    const bottomNavColor = '#192A5A'

    // Keep top status bar WHITE (doesn't change with theme)
    let themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta')
      themeColorMeta.name = 'theme-color'
      document.head.appendChild(themeColorMeta)
    }
    themeColorMeta.setAttribute('content', '#ffffff')

    // Update msapplication-navbutton-color to match bottom nav (for Windows Phone)
    let msNavButtonMeta = document.querySelector('meta[name="msapplication-navbutton-color"]')
    if (!msNavButtonMeta) {
      msNavButtonMeta = document.createElement('meta')
      msNavButtonMeta.name = 'msapplication-navbutton-color'
      document.head.appendChild(msNavButtonMeta)
    }
    msNavButtonMeta.setAttribute('content', bottomNavColor)

    // Update msapplication-TileColor to match bottom nav (for Windows tiles)
    let msTileColorMeta = document.querySelector('meta[name="msapplication-TileColor"]')
    if (!msTileColorMeta) {
      msTileColorMeta = document.createElement('meta')
      msTileColorMeta.name = 'msapplication-TileColor'
      document.head.appendChild(msTileColorMeta)
    }
    msTileColorMeta.setAttribute('content', bottomNavColor)
  }, [currentTheme])

  return null
}

