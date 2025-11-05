'use client'

import { useEffect } from 'react'
import { useTheme, themes } from '@/contexts/ThemeContext'

export default function ThemeMetaTags() {
  const { currentTheme } = useTheme()

  useEffect(() => {
    const theme = themes[currentTheme]
    if (!theme) return

    const sidebarColor = theme.background.sidebar

    // Update theme-color to match bottom navigation bar (sidebar color)
    // This affects both Android status bar and navigation bar
    let themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta')
      themeColorMeta.name = 'theme-color'
      document.head.appendChild(themeColorMeta)
    }
    themeColorMeta.setAttribute('content', sidebarColor)

    // Update msapplication-navbutton-color to match sidebar
    let msNavButtonMeta = document.querySelector('meta[name="msapplication-navbutton-color"]')
    if (msNavButtonMeta) {
      msNavButtonMeta.setAttribute('content', sidebarColor)
    }

    // Update msapplication-TileColor to match sidebar
    let msTileColorMeta = document.querySelector('meta[name="msapplication-TileColor"]')
    if (msTileColorMeta) {
      msTileColorMeta.setAttribute('content', sidebarColor)
    }
  }, [currentTheme])

  return null
}

