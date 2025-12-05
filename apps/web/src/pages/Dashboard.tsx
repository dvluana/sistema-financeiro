/**
 * Dashboard Page
 *
 * Tela inicial com visão geral do financeiro.
 * Exibe: resumo do mês atual, próximos vencimentos, gráfico e lançamentos recentes.
 */

import { useEffect } from 'react'
import { Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HeroCard } from '@/components/HeroCard'
import { UpcomingCard } from '@/components/UpcomingCard'
import { MiniChart } from '@/components/MiniChart'
import { RecentList } from '@/components/RecentList'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Lancamento } from '@/lib/api'

interface DashboardProps {
  onNavigateToMes: (filtro?: 'pendentes-entrada' | 'pendentes-saida') => void
  onOpenConfig: () => void
  onEditLancamento: (lancamento: Lancamento) => void
}

export function Dashboard({
  onNavigateToMes,
  onOpenConfig,
  onEditLancamento,
}: DashboardProps) {
  const { usuario, logout } = useAuthStore()
  const {
    totais,
    recentLancamentos,
    historico,
    pendentesEntrada,
    pendentesSaida,
    proximosVencimentos,
    isLoading,
    carregarDashboard,
    toggleConcluido,
  } = useDashboardStore()

  useEffect(() => {
    carregarDashboard()
  }, [carregarDashboard])

  const handleLogout = async () => {
    await logout()
  }

  // Handler para clicar em um vencimento
  const handleVencimentoClick = (id: string) => {
    // Busca o lançamento nos recentes ou navega para o mês
    const lancamento = recentLancamentos.find(l => l.id === id)
    if (lancamento) {
      onEditLancamento(lancamento)
    } else {
      // Navega para o mês com filtro de pendentes de saída
      onNavigateToMes('pendentes-saida')
    }
  }

  // Extrai nome do usuário (primeiro nome apenas)
  const primeiroNome = usuario?.nome?.split(' ')[0] || 'Usuário'

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutro-100 to-neutro-200 pb-20">
      {/* Header moderno (mesmo padrão da MesView) */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-neutro-200">
        <div className="max-w-[720px] mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              {/* Avatar com inicial */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-rosa to-rosa/80 text-white text-pequeno font-semibold">
                {primeiroNome.charAt(0).toUpperCase()}
              </div>
              <span className="text-corpo text-neutro-700 font-medium">
                {primeiroNome}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Botão de configurações */}
              <button
                type="button"
                onClick={onOpenConfig}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl',
                  'text-neutro-600 hover:text-neutro-900 hover:bg-neutro-100',
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
                  'text-neutro-500 hover:text-vermelho hover:bg-vermelho/5',
                  'transition-colors active:scale-95'
                )}
                aria-label="Sair"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-[720px] mx-auto p-4 space-y-4">
        {isLoading && !totais ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Hero - Saudação e resumo do mês */}
            <HeroCard
              nome={primeiroNome}
              saldo={totais?.saldo ?? 0}
              jaEntrou={totais?.jaEntrou ?? 0}
              jaPaguei={totais?.jaPaguei ?? 0}
              pendentesEntrada={pendentesEntrada}
              pendentesSaida={pendentesSaida}
            />

            {/* Gráfico dos últimos 6 meses */}
            {historico.length > 0 && (
              <div className="space-y-3">
                <div className="px-1">
                  <h2 className="text-corpo-medium text-neutro-900">
                    Histórico dos últimos 6 meses
                  </h2>
                </div>
                <div className="bg-white border border-neutro-200 rounded-xl p-4">
                  <MiniChart
                    dados={historico}
                    onMesClick={() => onNavigateToMes()}
                  />
                </div>
              </div>
            )}

            {/* Próximos Vencimentos - Carrossel */}
            {proximosVencimentos.length > 0 && (
              <UpcomingCard
                vencimentos={proximosVencimentos}
                onItemClick={handleVencimentoClick}
                onVerTodos={() => onNavigateToMes('pendentes-saida')}
              />
            )}

            {/* Últimos lançamentos */}
            <div className="space-y-3">
              <div className="px-1">
                <h2 className="text-corpo-medium text-neutro-900">
                  Últimos lançamentos
                </h2>
              </div>
              <div className="bg-white border border-neutro-200 rounded-xl p-4">
                <RecentList
                  lancamentos={recentLancamentos}
                  onItemClick={onEditLancamento}
                  onToggle={toggleConcluido}
                  onVerTodos={() => onNavigateToMes()}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
