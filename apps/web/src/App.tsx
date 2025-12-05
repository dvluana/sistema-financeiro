/**
 * App Principal
 *
 * Gerencia o roteamento entre autenticação e aplicação principal.
 * Verifica sessão ativa ao iniciar.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from './stores/useAuthStore'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

type AuthView = 'login' | 'register'

function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const [authView, setAuthView] = useState<AuthView>('login')

  // Verifica autenticação ao iniciar
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Tela de carregamento enquanto verifica auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rosa/5 via-background to-verde/5 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 text-rosa animate-spin" />
          <p className="text-corpo text-muted-foreground">Carregando...</p>
        </motion.div>
      </div>
    )
  }

  // Se autenticado, mostra Home
  if (isAuthenticated) {
    return <Home />
  }

  // Se não autenticado, mostra Login ou Register
  return (
    <AnimatePresence mode="wait">
      {authView === 'login' ? (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
        >
          <Login onSwitchToRegister={() => setAuthView('register')} />
        </motion.div>
      ) : (
        <motion.div
          key="register"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Register onSwitchToLogin={() => setAuthView('login')} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default App
