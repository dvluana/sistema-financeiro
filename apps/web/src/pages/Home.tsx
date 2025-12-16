/**
 * Home Page
 *
 * Container principal da aplicação com navegação entre Dashboard e Insights.
 * Gerencia estado de lançamentos e modais.
 *
 * Performance: Usa lazy loading para componentes pesados (modais/sheets)
 */

import { useState, useCallback, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinanceiroStore } from '@/stores/useFinanceiroStore'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { BottomTabBar, type TabType } from '@/components/BottomTabBar'
import { Dashboard } from './Dashboard'
import { Insights } from './Insights'
import { Lembretes } from './Lembretes'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Toast } from '@/components/Toast'
import { AddFAB } from '@/components/AddFAB'
import { lancamentosApi, type Lancamento, type CriarLancamentoInput } from '@/lib/api'
import type { ParsedLancamento } from '@/lib/parser'
import type { LancamentoFormData } from '@/components/LancamentoSheet'

// Lazy load de componentes pesados (sheets/modais)
const LancamentoSheet = lazy(() =>
  import('@/components/LancamentoSheet').then(m => ({ default: m.LancamentoSheet }))
)
const ConfiguracaoDrawer = lazy(() =>
  import('@/components/ConfiguracaoDrawer').then(m => ({ default: m.ConfiguracaoDrawer }))
)
const QuickInputSheet = lazy(() =>
  import('@/components/QuickInputSheet').then(m => ({ default: m.QuickInputSheet }))
)

export function Home() {
  // Tab ativo
  const [activeTab, setActiveTab] = useState<TabType>('inicio')

  // Estado global financeiro
  const {
    configuracoes,
    isLoading,
    error,
    carregarMes,
    criarLancamento,
    criarLancamentoRecorrente,
    atualizarLancamento,
    excluirLancamento,
    atualizarConfiguracao,
    limparErro,
  } = useFinanceiroStore()

  // Recarrega dashboard quando necessário
  const { carregarDashboard, mesSelecionado } = useDashboardStore()

  // Estado local para modais
  const [lancamentoSheetOpen, setLancamentoSheetOpen] = useState(false)
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [quickInputOpen, setQuickInputOpen] = useState(false)

  // Estado do formulário
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null)
  const [tipoInicial, setTipoInicial] = useState<'entrada' | 'saida'>('saida')

  /**
   * Abre drawer de lançamento manual (do FAB)
   */
  const handleOpenManualInput = useCallback(() => {
    setLancamentoSelecionado(null)
    setTipoInicial('saida')
    setLancamentoSheetOpen(true)
  }, [])

  /**
   * Abre formulário para nova entrada (dos cards)
   */
  const handleAddEntrada = useCallback(() => {
    setLancamentoSelecionado(null)
    setTipoInicial('entrada')
    setLancamentoSheetOpen(true)
  }, [])

  /**
   * Abre formulário para nova saída (dos cards)
   */
  const handleAddSaida = useCallback(() => {
    setLancamentoSelecionado(null)
    setTipoInicial('saida')
    setLancamentoSheetOpen(true)
  }, [])

  /**
   * Abre formulário para editar lançamento
   */
  const handleEditLancamento = useCallback((lancamento: Lancamento) => {
    setLancamentoSelecionado(lancamento)
    // Agrupadores são tratados como saída no formulário de edição
    setTipoInicial(lancamento.tipo === 'agrupador' ? 'saida' : lancamento.tipo)
    setLancamentoSheetOpen(true)
  }, [])

  /**
   * Submete o formulário (criar ou atualizar)
   */
  const handleFormSubmit = async (tipo: 'entrada' | 'saida', data: LancamentoFormData) => {
    try {
      if (lancamentoSelecionado) {
        await atualizarLancamento(lancamentoSelecionado.id, {
          nome: data.nome,
          valor: data.valor,
          data_prevista: data.data_prevista,
          concluido: data.concluido,
          categoria_id: data.categoria_id,
        })
      } else if (data.recorrencia) {
        const diaPrevisto = data.data_prevista
          ? parseInt(data.data_prevista.split('-')[2], 10)
          : null
        await criarLancamentoRecorrente({
          tipo,
          nome: data.nome,
          valor: data.valor,
          mes_inicial: mesSelecionado,
          dia_previsto: diaPrevisto,
          concluido: data.concluido,
          categoria_id: data.categoria_id,
          recorrencia: data.recorrencia,
        })
      } else {
        await criarLancamento({
          tipo,
          nome: data.nome,
          valor: data.valor,
          mes: mesSelecionado,
          concluido: data.concluido,
          data_prevista: data.data_prevista,
          categoria_id: data.categoria_id,
        })
      }
      setLancamentoSheetOpen(false)
      // Recarrega dashboard
      carregarDashboard(mesSelecionado)
    } catch {
      // Erro já tratado na store
    }
  }

  /**
   * Abre dialog de confirmação para exclusão
   */
  const handleDeleteClick = useCallback(() => {
    setConfirmDialogOpen(true)
  }, [])

  /**
   * Confirma exclusão do lançamento
   */
  const handleConfirmDelete = async () => {
    if (lancamentoSelecionado) {
      try {
        await excluirLancamento(lancamentoSelecionado.id)
        setConfirmDialogOpen(false)
        setLancamentoSheetOpen(false)
        // Recarrega dashboard
        carregarDashboard(mesSelecionado)
      } catch {
        // Erro já tratado na store
      }
    }
  }

  /**
   * Confirma lançamentos do Quick Input
   * Usa endpoint batch para criar todos de uma vez (melhor performance)
   */
  const handleQuickInputConfirm = async (lancamentos: ParsedLancamento[]) => {
    // Prepara dados para o batch
    const lancamentosData: CriarLancamentoInput[] = lancamentos.map(l => ({
      tipo: l.tipo,
      nome: l.nome,
      valor: l.valor!,
      mes: l.mes,
      concluido: false,
      data_prevista: l.diaPrevisto
        ? `${l.mes}-${String(l.diaPrevisto).padStart(2, '0')}`
        : null,
      categoria_id: l.categoriaId || null,
    }))

    // Cria todos os lançamentos em uma única requisição
    await lancamentosApi.criarLote(lancamentosData)

    // Recarrega dados
    await carregarMes(mesSelecionado)
    carregarDashboard(mesSelecionado)
  }

  // Configurações do usuário para auto-marcar concluído
  const autoMarcarConcluido = {
    entrada: Boolean(configuracoes.entradas_auto_recebido),
    saida: Boolean(configuracoes.saidas_auto_pago),
  }

  return (
    <div className="min-h-screen">
      {/* Conteúdo das telas com crossfade */}
      <AnimatePresence mode="wait">
        {activeTab === 'inicio' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Dashboard
              onOpenConfig={() => setConfigDrawerOpen(true)}
              onEditLancamento={handleEditLancamento}
              onAddEntrada={handleAddEntrada}
              onAddSaida={handleAddSaida}
            />
          </motion.div>
        )}
        {activeTab === 'lembretes' && (
          <motion.div
            key="lembretes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Lembretes onOpenConfig={() => setConfigDrawerOpen(true)} />
          </motion.div>
        )}
        {activeTab === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Insights onOpenConfig={() => setConfigDrawerOpen(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Drawer de lançamento manual - lazy loaded */}
      <Suspense fallback={null}>
        {lancamentoSheetOpen && (
          <LancamentoSheet
            open={lancamentoSheetOpen}
            onOpenChange={setLancamentoSheetOpen}
            mesAtual={mesSelecionado}
            lancamento={lancamentoSelecionado}
            tipoInicial={tipoInicial}
            autoMarcarConcluido={autoMarcarConcluido}
            onSubmit={handleFormSubmit}
            onDelete={lancamentoSelecionado ? handleDeleteClick : undefined}
            isLoading={isLoading}
          />
        )}
      </Suspense>

      {/* Drawer de configurações - lazy loaded */}
      <Suspense fallback={null}>
        {configDrawerOpen && (
          <ConfiguracaoDrawer
            open={configDrawerOpen}
            onOpenChange={setConfigDrawerOpen}
            configuracoes={configuracoes}
            onUpdateConfig={atualizarConfiguracao}
          />
        )}
      </Suspense>

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Excluir este item?"
        description={lancamentoSelecionado?.nome ?? ''}
        onConfirm={handleConfirmDelete}
      />

      {/* Toast de erro */}
      <Toast
        message={error}
        onClose={limparErro}
        onRetry={() => carregarMes(mesSelecionado)}
      />

      {/* FAB com menu de opções */}
      <AddFAB
        onQuickInput={() => setQuickInputOpen(true)}
        onManualInput={handleOpenManualInput}
        className="bottom-24 right-4"
      />

      {/* Sheet de lançamento rápido - lazy loaded */}
      <Suspense fallback={null}>
        {quickInputOpen && (
          <QuickInputSheet
            open={quickInputOpen}
            onOpenChange={setQuickInputOpen}
            mesAtual={mesSelecionado}
            onConfirm={handleQuickInputConfirm}
          />
        )}
      </Suspense>
    </div>
  )
}
