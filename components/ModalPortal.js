'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ModalPortal({ children, show }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!show || !mounted) return null

  return createPortal(
    children,
    document.body
  )
}

