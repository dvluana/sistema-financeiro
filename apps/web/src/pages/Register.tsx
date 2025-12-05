/**
 * Página de Cadastro
 *
 * Permite que novos usuários criem uma conta no sistema.
 * Inclui link para página de login.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/useAuthStore'

interface RegisterProps {
  onSwitchToLogin: () => void
}

export function Register({ onSwitchToLogin }: RegisterProps) {
  const { register, isLoading, error, clearError } = useAuthStore()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!nome.trim()) {
      setLocalError('Digite seu nome')
      return
    }

    if (!email.trim()) {
      setLocalError('Digite seu email')
      return
    }

    if (!senha) {
      setLocalError('Digite sua senha')
      return
    }

    if (senha.length < 6) {
      setLocalError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (senha !== confirmarSenha) {
      setLocalError('As senhas não coincidem')
      return
    }

    try {
      await register(nome, email, senha)
    } catch {
      // Erro já tratado na store
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-gradient-to-br from-verde-bg via-white to-rosa-light flex items-center justify-center p-4">
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
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-verde to-verde-hover mb-4"
          >
            <Wallet className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-titulo-mes text-neutro-900">Criar sua conta</h1>
          <p className="text-corpo text-neutro-600 mt-1">
            Comece a controlar suas finanças
          </p>
        </div>

        {/* Card do formulário */}
        <div className="bg-white rounded-card border border-neutro-300 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutro-400" />
                <Input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="pl-12"
                  autoComplete="name"
                  enableAutofill
                />
              </div>
            </div>

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
                  placeholder="Mínimo 6 caracteres"
                  className="pl-12 pr-12"
                  autoComplete="new-password"
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

            {/* Campo Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutro-400" />
                <Input
                  id="confirmarSenha"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  className="pl-12"
                  autoComplete="new-password"
                />
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

            {/* Botão Criar conta */}
            <Button
              type="submit"
              className="w-full bg-verde hover:bg-verde-hover"
              disabled={isLoading}
            >
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          {/* Link para login */}
          <div className="mt-6 text-center">
            <p className="text-corpo text-neutro-600">
              Já tem uma conta?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-rosa font-medium hover:underline"
              >
                Entrar
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
