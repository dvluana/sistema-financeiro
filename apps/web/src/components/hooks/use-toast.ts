import { useState, useCallback } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

const TOAST_LIMIT = 1

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] })

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    const newToast = { ...toast, id }
    
    setState((state) => ({
      toasts: [newToast, ...state.toasts].slice(0, TOAST_LIMIT),
    }))

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setState((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  }, [])

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = addToast(props)
    return {
      id,
      dismiss: () => removeToast(id),
    }
  }, [addToast, removeToast])

  return {
    toast,
    toasts: state.toasts,
  }
}
