/**
 * Hook useMediaQuery
 *
 * Detecta se uma media query corresponde ao viewport atual.
 * Útil para renderização condicional baseada em tamanho de tela.
 */

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Set initial value
    setMatches(mediaQuery.matches)

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

// Breakpoints predefinidos (seguindo Tailwind)
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const

// Hook específico para detectar desktop (lg+)
export function useIsDesktop(): boolean {
  return useMediaQuery(breakpoints.lg)
}

// Hook específico para detectar tablet grande (xl+)
export function useIsLargeTablet(): boolean {
  return useMediaQuery(breakpoints.xl)
}
