/**
 * Dashboard Page
 *
 * Tela inicial unificada com visão geral do financeiro.
 * Exibe: resumo do mês, próximos vencimentos, gráfico e todos os lançamentos do mês.
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Settings, LogOut } from 'lucide-react'
import { cn, getMesAtual } from '@/lib/utils'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import { HeroCard } from '@/components/HeroCard'
import { UpcomingCard } from '@/components/UpcomingCard'
import { CardEntradas } from '@/components/CardEntradas'
import { CardSaidas } from '@/components/CardSaidas'
import { RecentList } from '@/components/RecentList'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useFinanceiroStore } from '@/stores/useFinanceiroStore'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Lancamento } from '@/lib/api'

type LancamentoFilter = 'todos' | 'entradas' | 'saidas'

interface DashboardProps {
  onOpenConfig: () => void
  onEditLancamento: (lancamento: Lancamento) => void
  onAddEntrada: () => void
  onAddSaida: () => void
  onAddFilho?: (agrupador: Lancamento) => void
  onEditFilho?: (filho: Lancamento, agrupador: Lancamento) => void
  onToggleFilho?: (filho: Lancamento) => void
}

export function Dashboard({
  onOpenConfig,
  onEditLancamento,
  onAddEntrada,
  onAddSaida,
  onAddFilho,
  onEditFilho,
  onToggleFilho,
}: DashboardProps) {
  // Filtro de visualização de lançamentos
  const [lancamentoFilter, setLancamentoFilter] = useState<LancamentoFilter>('todos')

  const { usuario, logout } = useAuthStore()
  const {
    mesSelecionado,
    totais: dashboardTotais,
    pendentesEntrada,
    pendentesSaida,
    proximosVencimentos,
    isLoading: isDashboardLoading,
    carregarDashboard,
    navegarMesAnterior,
    navegarMesProximo,
    irParaMesAtual,
  } = useDashboardStore()

  // Store financeiro para lançamentos detalhados do mês
  const {
    entradas,
    saidas,
    agrupadores,
    totais: financeiroTotais,
    configuracoes,
    isLoading: isFinanceiroLoading,
    carregarMes,
    carregarConfiguracoes,
    toggleConcluido,
  } = useFinanceiroStore()

  // Verifica se pode avançar para o próximo mês
  const mesAtual = getMesAtual()
  const podeAvancar = mesSelecionado < mesAtual

  // Usa os totais do dashboard para os cards de resumo
  const totais = dashboardTotais

  // Loading combinado
  const isLoading = isDashboardLoading || isFinanceiroLoading

  // Configuração para mostrar concluídos discretos
  const mostrarConcluidosDiscretos = Boolean(configuracoes.mostrar_concluidos_discretos)

  // Carrega dados iniciais
  useEffect(() => {
    carregarConfiguracoes()
  }, [carregarConfiguracoes])

  // Carrega dashboard e lançamentos quando mês muda
  // Combina as duas chamadas para evitar duplicação
  useEffect(() => {
    if (mesSelecionado) {
      // Dashboard já retorna totais do mês selecionado
      carregarDashboard(mesSelecionado)
      // Lançamentos detalhados para as listas
      carregarMes(mesSelecionado)
    }
  }, [mesSelecionado, carregarDashboard, carregarMes])

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  // Handler para clicar em um vencimento (memoizado)
  const handleVencimentoClick = useCallback((id: string) => {
    // Busca o lançamento nas entradas ou saídas
    const lancamento = [...entradas, ...saidas].find(l => l.id === id)
    if (lancamento) {
      onEditLancamento(lancamento)
    }
  }, [entradas, saidas, onEditLancamento])

  // Lista ordenada de lançamentos (memoizada para evitar recálculo)
  // Inclui entradas, saídas E agrupadores para exibir todos na aba "Todos"
  const lancamentosOrdenados = useMemo(() => {
    return [...entradas, ...saidas, ...agrupadores].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [entradas, saidas, agrupadores])

  // Extrai nome do usuário (primeiro nome apenas)
  const primeiroNome = usuario?.nome?.split(' ')[0] || 'Usuário'

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background pb-20">
      {/* Header moderno (mesmo padrão da MesView) */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[720px] mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
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
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-[720px] mx-auto p-4 space-y-6">
        {isLoading && !totais ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Hero - Saudação e resumo do mês */}
            <HeroCard
              nome={primeiroNome}
              mesSelecionado={mesSelecionado}
              saldo={totais?.saldo ?? 0}
              jaEntrou={totais?.jaEntrou ?? 0}
              jaPaguei={totais?.jaPaguei ?? 0}
              pendentesEntrada={pendentesEntrada}
              pendentesSaida={pendentesSaida}
              onMesAnterior={navegarMesAnterior}
              onMesProximo={navegarMesProximo}
              onIrParaHoje={irParaMesAtual}
              podeAvancar={podeAvancar}
              isLoading={isLoading}
            />

            {/* Próximos Vencimentos */}
            <UpcomingCard
              vencimentos={proximosVencimentos}
              onItemClick={handleVencimentoClick}
              isLoading={isLoading}
            />

            {/* Lançamentos do mês */}
            <div className="space-y-3">
              <div className="px-1">
                <h2 className="text-corpo-medium text-foreground">
                  Lançamentos
                </h2>
              </div>
              <div className="flex gap-2 p-1 bg-secondary rounded-xl">
                <button
                  type="button"
                  onClick={() => setLancamentoFilter('todos')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-corpo font-medium transition-all',
                    lancamentoFilter === 'todos'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setLancamentoFilter('entradas')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-corpo font-medium transition-all',
                    lancamentoFilter === 'entradas'
                      ? 'bg-verde text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Entradas
                </button>
                <button
                  type="button"
                  onClick={() => setLancamentoFilter('saidas')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-corpo font-medium transition-all',
                    lancamentoFilter === 'saidas'
                      ? 'bg-vermelho text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Saídas
                </button>
              </div>

              {/* Conteúdo baseado no filtro selecionado */}
              {lancamentoFilter === 'todos' && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <RecentList
                    lancamentos={lancamentosOrdenados}
                    onItemClick={onEditLancamento}
                    onToggle={toggleConcluido}
                    onVerTodos={() => {}}
                    showVerTodos={false}
                  />
                </div>
              )}

              {lancamentoFilter === 'entradas' && (
                <CardEntradas
                  entradas={entradas}
                  jaEntrou={financeiroTotais?.jaEntrou ?? 0}
                  faltaEntrar={financeiroTotais?.faltaEntrar ?? 0}
                  mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                  onToggle={toggleConcluido}
                  onEdit={onEditLancamento}
                  onAdd={onAddEntrada}
                />
              )}

              {lancamentoFilter === 'saidas' && (
                <CardSaidas
                  saidas={saidas}
                  agrupadores={agrupadores}
                  jaPaguei={financeiroTotais?.jaPaguei ?? 0}
                  faltaPagar={financeiroTotais?.faltaPagar ?? 0}
                  mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                  onToggle={toggleConcluido}
                  onEdit={onEditLancamento}
                  onAdd={onAddSaida}
                  onAddFilho={onAddFilho}
                  onEditFilho={onEditFilho}
                  onToggleFilho={onToggleFilho}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
