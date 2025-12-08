'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Portal component that renders children into document.body
 * This ensures modals appear above all other content including headers/sidebars
 */
export default function Portal({ children }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(children, document.body)
}
