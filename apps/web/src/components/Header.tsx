/**
 * Header Component
 *
 * Cabeçalho moderno com navegação entre meses.
 * Design limpo com ícones refinados e áreas de toque otimizadas.
 * Totalmente responsivo para mobile e desktop.
 */

import { ChevronLeft, ChevronRight, Settings, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatarMesAno } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

interface HeaderProps {
  mes: string
  onMesAnterior: () => void
  onProximoMes: () => void
  onOpenConfig: () => void
}

export function Header({
  mes,
  onMesAnterior,
  onProximoMes,
  onOpenConfig,
}: HeaderProps) {
  const { logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-[720px] mx-auto">
        {/* Barra superior com workspace switcher */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          {/* Workspace Switcher */}
          <WorkspaceSwitcher />

          <div className="flex items-center gap-1">
            {/* Botão de configurações */}
            <button
              type="button"
              onClick={onOpenConfig}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                'transition-colors active:scale-95'
              )}
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Botão de logout */}
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl',
                'text-muted-foreground hover:text-vermelho hover:bg-vermelho/5',
                'transition-colors active:scale-95'
              )}
              aria-label="Sair"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Navegação do mês */}
        <div className="flex items-center justify-between px-2 py-2">
          {/* Botão mês anterior */}
          <motion.button
            type="button"
            onClick={onMesAnterior}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-xl',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              'transition-colors'
            )}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2} />
          </motion.button>

          {/* Título do mês */}
          <motion.h1
            key={mes}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xl sm:text-2xl font-bold text-foreground tracking-tight"
          >
            {formatarMesAno(mes)}
          </motion.h1>

          {/* Botão próximo mês */}
          <motion.button
            type="button"
            onClick={onProximoMes}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-xl',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              'transition-colors'
            )}
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2} />
          </motion.button>
        </div>
      </div>
    </header>
  )
}
