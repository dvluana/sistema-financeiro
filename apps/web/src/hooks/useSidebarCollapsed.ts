/**
 * Hook para gerenciar estado do sidebar colapsado
 * Persiste a preferência do usuário no localStorage
 */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'sidebar_collapsed'

export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'true'
  })

  // Sincroniza com localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed))
  }, [isCollapsed])

  const toggle = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  const collapse = useCallback(() => {
    setIsCollapsed(true)
  }, [])

  const expand = useCallback(() => {
    setIsCollapsed(false)
  }, [])

  return {
    isCollapsed,
    toggle,
    collapse,
    expand,
  }
}
