/**
 * Hook para navegação por swipe
 *
 * Detecta gestos de swipe horizontal e dispara callbacks
 * para navegação entre meses.
 */

import { useState, useCallback } from 'react'
import type { PanInfo } from 'framer-motion'

interface UseSwipeNavigationOptions {
  threshold?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

interface UseSwipeNavigationReturn {
  direction: number
  handleDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void
  setDirection: (dir: number) => void
}

export function useSwipeNavigation({
  threshold = 50,
  onSwipeLeft,
  onSwipeRight,
}: UseSwipeNavigationOptions): UseSwipeNavigationReturn {
  const [direction, setDirection] = useState(0)

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > threshold) {
        setDirection(-1)
        onSwipeRight?.()
      } else if (info.offset.x < -threshold) {
        setDirection(1)
        onSwipeLeft?.()
      }
    },
    [threshold, onSwipeLeft, onSwipeRight]
  )

  return {
    direction,
    handleDragEnd,
    setDirection,
  }
}
