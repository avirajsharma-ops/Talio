'use client'

import { useEffect } from 'react'
import { useTheme, themes } from '@/contexts/ThemeContext'

export default function ThemeMetaTags() {
  const { currentTheme } = useTheme()

  useEffect(() => {
    const theme = themes[currentTheme]
    if (!theme) return

    const sidebarColor = theme.background.sidebar

    // Keep top status bar WHITE (doesn't change with theme)
    let themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta')
      themeColorMeta.name = 'theme-color'
      document.head.appendChild(themeColorMeta)
    }
    themeColorMeta.setAttribute('content', '#ffffff')

    // Update msapplication-navbutton-color to match sidebar (for Windows Phone)
    let msNavButtonMeta = document.querySelector('meta[name="msapplication-navbutton-color"]')
    if (msNavButtonMeta) {
      msNavButtonMeta.setAttribute('content', sidebarColor)
    }

    // Update msapplication-TileColor to match sidebar (for Windows tiles)
    let msTileColorMeta = document.querySelector('meta[name="msapplication-TileColor"]')
    if (msTileColorMeta) {
      msTileColorMeta.setAttribute('content', sidebarColor)
    }
  }, [currentTheme])

  return null
}

