/**
 * Header Component
 *
 * Cabeçalho da aplicação com navegação entre meses, configurações e logout.
 * Exibe o mês atual formatado e informações do usuário.
 */

import { ChevronLeft, ChevronRight, Settings, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatarMesAno } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'

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
  const { usuario, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-neutro-200">
      {/* Barra superior com usuário e logout */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-rosa-light/50 to-verde-bg/50 border-b border-neutro-200">
        <div className="flex items-center gap-2 text-pequeno text-neutro-700">
          <User className="w-4 h-4" />
          <span className="font-medium">{usuario?.nome}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-pequeno text-neutro-600 hover:text-vermelho transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>

      {/* Navegação do mês */}
      <div className="flex items-center justify-between h-14 px-2">
        {/* Navegação para mês anterior */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMesAnterior}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-6 h-6 text-neutro-900" />
        </Button>

        {/* Título do mês */}
        <h1 className="text-titulo-mes text-neutro-900">
          {formatarMesAno(mes)}
        </h1>

        {/* Ações à direita */}
        <div className="flex items-center gap-1">
          {/* Navegação para próximo mês */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onProximoMes}
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 text-neutro-900" />
          </Button>

          {/* Botão de configurações */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenConfig}
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5 text-neutro-900" />
          </Button>
        </div>
      </div>
    </header>
  )
}
