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
import { NavigationBar, type TabType } from '@/components/NavigationBar'
import { Dashboard } from './Dashboard'
import { Insights } from './Insights'
import { Lembretes } from './Lembretes'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Toast } from '@/components/Toast'
import { AddFAB } from '@/components/AddFAB'
import { lancamentosApi, type Lancamento, type CriarLancamentoInput } from '@/lib/api'
import type { ParsedLancamento } from '@/lib/parser'
import type { LancamentoFormData } from '@/components/LancamentoSheet'
import type { FilhoFormData } from '@/components/FilhoSheet'

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
const FilhoSheet = lazy(() =>
  import('@/components/FilhoSheet').then(m => ({ default: m.FilhoSheet }))
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
    criarFilho,
    toggleConcluido,
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
  const [filhoSheetOpen, setFilhoSheetOpen] = useState(false)

  // Estado do formulário
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null)
  const [tipoInicial, setTipoInicial] = useState<'entrada' | 'saida'>('saida')

  // Estado para filhos de agrupadores
  const [agrupadorSelecionado, setAgrupadorSelecionado] = useState<Lancamento | null>(null)
  const [filhoSelecionado, setFilhoSelecionado] = useState<Lancamento | null>(null)

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
    setTipoInicial(lancamento.tipo)
    setLancamentoSheetOpen(true)
  }, [])

  /**
   * Abre formulário para adicionar filho a um agrupador
   */
  const handleAddFilho = useCallback((agrupador: Lancamento) => {
    setAgrupadorSelecionado(agrupador)
    setFilhoSelecionado(null)
    setFilhoSheetOpen(true)
  }, [])

  /**
   * Abre formulário para editar filho de um agrupador
   */
  const handleEditFilho = useCallback((filho: Lancamento, agrupador: Lancamento) => {
    setAgrupadorSelecionado(agrupador)
    setFilhoSelecionado(filho)
    setFilhoSheetOpen(true)
  }, [])

  /**
   * Toggle concluído de um filho
   */
  const handleToggleFilho = useCallback((filho: Lancamento) => {
    toggleConcluido(filho.id)
  }, [toggleConcluido])

  /**
   * Submete formulário de filho (criar ou atualizar)
   */
  const handleFilhoSubmit = async (data: FilhoFormData) => {
    if (!agrupadorSelecionado) return

    try {
      if (filhoSelecionado) {
        // Editar filho existente
        await atualizarLancamento(filhoSelecionado.id, {
          nome: data.nome,
          valor: data.valor,
          data_prevista: data.data_prevista,
          concluido: data.concluido,
          categoria_id: data.categoria_id,
        })
      } else {
        // Criar novo filho
        await criarFilho(agrupadorSelecionado.id, {
          tipo: 'saida',
          nome: data.nome,
          valor: data.valor,
          concluido: data.concluido,
          data_prevista: data.data_prevista,
          categoria_id: data.categoria_id,
        })
      }
      setFilhoSheetOpen(false)
      carregarDashboard(mesSelecionado)
    } catch {
      // Erro já tratado na store
    }
  }

  /**
   * Abre dialog de confirmação para excluir filho
   */
  const handleDeleteFilhoClick = useCallback(() => {
    setConfirmDialogOpen(true)
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
          is_agrupador: data.is_agrupador,
          valor_modo: data.valor_modo,
        })
      } else if (data.recorrencia) {
        // Recorrência (suporta agrupadores também)
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
          is_agrupador: data.is_agrupador,
          valor_modo: data.valor_modo,
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
          is_agrupador: data.is_agrupador,
          valor_modo: data.valor_modo,
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
   * Confirma exclusão do lançamento ou filho
   */
  const handleConfirmDelete = async () => {
    try {
      if (filhoSelecionado) {
        // Excluir filho
        await excluirLancamento(filhoSelecionado.id)
        setConfirmDialogOpen(false)
        setFilhoSheetOpen(false)
        setFilhoSelecionado(null)
      } else if (lancamentoSelecionado) {
        // Excluir lançamento principal
        await excluirLancamento(lancamentoSelecionado.id)
        setConfirmDialogOpen(false)
        setLancamentoSheetOpen(false)
      }
      // Recarrega dashboard
      carregarDashboard(mesSelecionado)
    } catch {
      // Erro já tratado na store
    }
  }

  /**
   * Confirma lançamentos do Quick Input
   * Usa endpoint batch para criar todos de uma vez (melhor performance)
   */
  const handleQuickInputConfirm = async (lancamentos: ParsedLancamento[]) => {
    // Prepara dados para o batch
    const lancamentosData: CriarLancamentoInput[] = lancamentos.map(l => {
      const isAgrupador = l.isAgrupador || false
      const valorModo = l.valorModo || 'soma'

      return {
        tipo: l.tipo,
        nome: l.nome,
        valor: isAgrupador && valorModo === 'soma' ? 0 : (l.valor ?? 0), // Grupo com soma começa com valor 0
        mes: l.mes,
        concluido: l.concluido || false,
        data_prevista: l.diaPrevisto
          ? `${l.mes}-${String(l.diaPrevisto).padStart(2, '0')}`
          : null,
        categoria_id: l.categoriaId || undefined,
        is_agrupador: isAgrupador,
        valor_modo: valorModo,
      }
    })

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
    <div className="min-h-screen flex">
      {/* Navegação - Sidebar no desktop, bottom bar no mobile */}
      <NavigationBar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onOpenSettings={() => setConfigDrawerOpen(true)}
      />

      {/* Container principal com padding para sidebar no desktop */}
      <div className="flex-1 lg:ml-64">
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
              onAddFilho={handleAddFilho}
              onEditFilho={handleEditFilho}
              onToggleFilho={handleToggleFilho}
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
        {activeTab === 'relatorios' && (
          <motion.div
            key="relatorios"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Insights onOpenConfig={() => setConfigDrawerOpen(true)} />
          </motion.div>
        )}
        </AnimatePresence>

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
        description={filhoSelecionado?.nome ?? lancamentoSelecionado?.nome ?? ''}
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
        className="bottom-20 right-6 lg:bottom-8"
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

      {/* Sheet para adicionar/editar filhos de agrupadores - lazy loaded */}
      <Suspense fallback={null}>
        {filhoSheetOpen && agrupadorSelecionado && (
          <FilhoSheet
            open={filhoSheetOpen}
            onOpenChange={setFilhoSheetOpen}
            agrupador={agrupadorSelecionado}
            filho={filhoSelecionado}
            onSubmit={handleFilhoSubmit}
            onDelete={filhoSelecionado ? handleDeleteFilhoClick : undefined}
            isLoading={isLoading}
          />
        )}
      </Suspense>
      </div>
    </div>
  )
}
