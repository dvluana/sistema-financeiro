/**
 * Dashboard Page
 *
 * Tela inicial com visão geral do financeiro.
 * Exibe: resumo do mês atual, pendências, gráfico e lançamentos recentes.
 */

import { useEffect } from 'react'
import { Settings, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HeroCard } from '@/components/HeroCard'
import { PendingCard } from '@/components/PendingCard'
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
    mesAtual,
    totais,
    recentLancamentos,
    historico,
    pendentesEntrada,
    pendentesSaida,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutro-100 to-neutro-200 pb-20">
      {/* Header simplificado */}
      <header className="sticky top-0 z-10 bg-white border-b border-neutro-200">
        <div className="flex items-center justify-between px-4 py-3 max-w-[720px] mx-auto">
          <div className="flex items-center gap-2 text-pequeno text-neutro-700">
            <User className="w-4 h-4" />
            <span className="font-medium">{usuario?.nome}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenConfig}
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5 text-neutro-900" />
            </Button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-pequeno text-neutro-600 hover:text-vermelho transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-[720px] mx-auto p-4 space-y-4">
        {isLoading && !totais ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Hero Card - Resumo do mês */}
            <HeroCard
              mes={mesAtual}
              saldo={totais?.saldo ?? 0}
              totalEntradas={totais?.entradas ?? 0}
              totalSaidas={totais?.saidas ?? 0}
              onClick={() => onNavigateToMes()}
            />

            {/* Cards de Pendentes */}
            <div className="flex gap-3">
              <PendingCard
                tipo="entrada"
                valor={totais?.faltaEntrar ?? 0}
                quantidade={pendentesEntrada}
                onClick={() => onNavigateToMes('pendentes-entrada')}
              />
              <PendingCard
                tipo="saida"
                valor={totais?.faltaPagar ?? 0}
                quantidade={pendentesSaida}
                onClick={() => onNavigateToMes('pendentes-saida')}
              />
            </div>

            {/* Gráfico dos últimos 6 meses */}
            {historico.length > 0 && (
              <Card>
                <h2 className="text-titulo-card text-neutro-900 mb-3">
                  Últimos 6 meses
                </h2>
                <MiniChart
                  dados={historico}
                  onMesClick={(mes) => {
                    // Navega para o mês clicado
                    // Por enquanto só vai para a tela de mês
                    onNavigateToMes()
                  }}
                />
              </Card>
            )}

            {/* Últimos lançamentos */}
            <Card>
              <h2 className="text-titulo-card text-neutro-900 mb-3">
                Últimos lançamentos
              </h2>
              <RecentList
                lancamentos={recentLancamentos}
                onItemClick={onEditLancamento}
                onToggle={toggleConcluido}
                onVerTodos={() => onNavigateToMes()}
              />
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
