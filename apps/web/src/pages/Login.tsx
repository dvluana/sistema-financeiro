/**
 * Página de Login
 *
 * Permite que usuários existentes façam login no sistema.
 * Inclui link para página de cadastro.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/useAuthStore'

interface LoginProps {
  onSwitchToRegister: () => void
}

export function Login({ onSwitchToRegister }: LoginProps) {
  const { login, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!email.trim()) {
      setLocalError('Digite seu email')
      return
    }

    if (!senha) {
      setLocalError('Digite sua senha')
      return
    }

    try {
      await login(email, senha)
    } catch {
      // Erro já tratado na store
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-gradient-to-br from-rosa-light via-white to-verde-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo e título */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rosa to-rosa-hover mb-4"
          >
            <Wallet className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-titulo-mes text-rosa">Financify</h1>
          <p className="text-corpo text-neutro-600 mt-1">
            Entre na sua conta para continuar
          </p>
        </div>

        {/* Card do formulário */}
        <div className="bg-white rounded-card border border-neutro-300 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutro-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-12"
                  autoComplete="email"
                  enableAutofill
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutro-400" />
                <Input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  className="pl-12 pr-12"
                  autoComplete="current-password"
                  enableAutofill
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutro-400 hover:text-neutro-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Erro */}
            {displayError && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-pequeno text-vermelho text-center bg-vermelho-bg p-3 rounded-input"
              >
                {displayError}
              </motion.p>
            )}

            {/* Botão Entrar */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Link para cadastro */}
          <div className="mt-6 text-center">
            <p className="text-corpo text-neutro-600">
              Não tem uma conta?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-rosa font-medium hover:underline"
              >
                Criar conta
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
