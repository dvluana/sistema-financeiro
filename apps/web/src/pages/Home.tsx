/**
 * Home Page
 *
 * Container principal da aplicação com navegação entre Dashboard e Insights.
 * Gerencia estado de lançamentos e modais.
 *
 * Performance: Usa lazy loading para componentes pesados (modais/sheets)
 */

import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinanceiroStore } from '@/stores/useFinanceiroStore'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { NavigationBar, type TabType, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from '@/components/NavigationBar'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { Dashboard } from './Dashboard'
import { Insights } from './Insights'
import { Lembretes } from './Lembretes'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RecorrenciaActionDialog } from '@/components/RecorrenciaActionDialog'
import { Toast } from '@/components/Toast'
import { AddFAB } from '@/components/AddFAB'
import {
  lancamentosApi,
  type Lancamento,
  type CriarLancamentoInput,
  type InfoRecorrencia,
  type EscopoRecorrencia
} from '@/lib/api'
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

  // Estado do sidebar colapsado
  const { isCollapsed, toggle: toggleSidebar } = useSidebarCollapsed()
  const isDesktop = useIsDesktop()

  // Estado global financeiro
  const {
    configuracoes,
    isLoading,
    error,
    success,
    carregarMes,
    criarLancamento,
    criarLancamentoRecorrente,
    atualizarLancamento,
    excluirLancamento,
    criarFilho,
    toggleConcluido,
    atualizarConfiguracao,
    limparErro,
    limparSucesso,
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

  // Estado para operações em lote de recorrência
  const [infoRecorrencia, setInfoRecorrencia] = useState<InfoRecorrencia | null>(null)
  const [recorrenciaDialogOpen, setRecorrenciaDialogOpen] = useState(false)
  const [recorrenciaAction, setRecorrenciaAction] = useState<'editar' | 'excluir'>('editar')
  const [pendingFormData, setPendingFormData] = useState<{ tipo: 'entrada' | 'saida'; data: LancamentoFormData } | null>(null)
  const [isRecorrenciaLoading, setIsRecorrenciaLoading] = useState(false)

  // Estado local para mensagens de sucesso (operações que não passam pela store)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Busca informações de recorrência quando um lançamento é selecionado para edição
  useEffect(() => {
    async function fetchInfoRecorrencia() {
      if (lancamentoSelecionado?.id && lancamentoSheetOpen) {
        try {
          const info = await lancamentosApi.infoRecorrencia(lancamentoSelecionado.id)
          setInfoRecorrencia(info)
        } catch {
          setInfoRecorrencia(null)
        }
      } else {
        setInfoRecorrencia(null)
      }
    }
    fetchInfoRecorrencia()
  }, [lancamentoSelecionado?.id, lancamentoSheetOpen])

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
   * Se for edição de lançamento recorrente, mostra dialog de escopo
   */
  const handleFormSubmit = async (tipo: 'entrada' | 'saida', data: LancamentoFormData) => {
    try {
      if (lancamentoSelecionado) {
        // Edição: verificar se é recorrente
        if (infoRecorrencia?.recorrenciaId) {
          // Armazena dados e mostra dialog de escopo
          setPendingFormData({ tipo, data })
          setRecorrenciaAction('editar')
          setRecorrenciaDialogOpen(true)
          return
        }

        // Não é recorrente: atualiza normalmente
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
   * Se for lançamento recorrente, mostra dialog de escopo
   */
  const handleDeleteClick = useCallback(() => {
    if (infoRecorrencia?.recorrenciaId) {
      // É recorrente: mostra dialog de escopo
      setRecorrenciaAction('excluir')
      setRecorrenciaDialogOpen(true)
    } else {
      // Não é recorrente: mostra dialog simples
      setConfirmDialogOpen(true)
    }
  }, [infoRecorrencia?.recorrenciaId])

  /**
   * Confirma exclusão do lançamento ou filho (não recorrente)
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
   * Confirma operação em lote de recorrência (edição ou exclusão)
   */
  const handleRecorrenciaConfirm = async (escopo: EscopoRecorrencia) => {
    if (!lancamentoSelecionado) return

    setIsRecorrenciaLoading(true)

    try {
      if (recorrenciaAction === 'editar' && pendingFormData) {
        // Edição em lote
        const result = await lancamentosApi.atualizarRecorrencia(
          lancamentoSelecionado.id,
          escopo,
          {
            nome: pendingFormData.data.nome,
            valor: pendingFormData.data.valor,
            data_prevista: pendingFormData.data.data_prevista,
            concluido: pendingFormData.data.concluido,
            categoria_id: pendingFormData.data.categoria_id,
          }
        )
        setPendingFormData(null)
        // Mostra toast de sucesso
        const count = result.atualizados ?? 1
        setSuccessMessage(`${count} lançamento${count > 1 ? 's' : ''} atualizado${count > 1 ? 's' : ''}!`)
      } else if (recorrenciaAction === 'excluir') {
        // Exclusão em lote
        const result = await lancamentosApi.excluirRecorrencia(lancamentoSelecionado.id, escopo)
        // Mostra toast de sucesso
        const count = result.excluidos ?? 1
        setSuccessMessage(`${count} lançamento${count > 1 ? 's' : ''} excluído${count > 1 ? 's' : ''}!`)
      }

      setRecorrenciaDialogOpen(false)
      setLancamentoSheetOpen(false)
      setLancamentoSelecionado(null)
      setInfoRecorrencia(null)

      // Recarrega dados
      await carregarMes(mesSelecionado)
      carregarDashboard(mesSelecionado)
    } catch {
      // Erro será tratado pela API
    } finally {
      setIsRecorrenciaLoading(false)
    }
  }

  /**
   * Confirma lançamentos do Quick Input
   * Separa recorrentes (endpoint individual) de normais (batch)
   */
  const handleQuickInputConfirm = async (lancamentos: ParsedLancamento[]) => {
    // Separa lançamentos com e sem recorrência
    const comRecorrencia = lancamentos.filter(l => l.recorrencia)
    const semRecorrencia = lancamentos.filter(l => !l.recorrencia)

    // 1. Cria lançamentos normais em batch
    if (semRecorrencia.length > 0) {
      const lancamentosData: CriarLancamentoInput[] = semRecorrencia.map(l => {
        const isAgrupador = l.isAgrupador || false
        const valorModo = l.valorModo || 'soma'

        return {
          tipo: l.tipo,
          nome: l.nome,
          valor: isAgrupador && valorModo === 'soma' ? 0 : (l.valor ?? 0),
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

      await lancamentosApi.criarLote(lancamentosData)
    }

    // 2. Cria lançamentos recorrentes individualmente
    for (const l of comRecorrencia) {
      const isAgrupador = l.isAgrupador || false
      const valorModo = l.valorModo || 'soma'

      await criarLancamentoRecorrente({
        tipo: l.tipo,
        nome: l.nome,
        valor: isAgrupador && valorModo === 'soma' ? 0 : (l.valor ?? 0),
        mes_inicial: l.mes,
        dia_previsto: l.diaPrevisto,
        concluido: l.concluido || false,
        categoria_id: l.categoriaId || undefined,
        is_agrupador: isAgrupador,
        valor_modo: valorModo,
        recorrencia: l.recorrencia!,
      })
    }

    // Recarrega dados
    await carregarMes(mesSelecionado)
    carregarDashboard(mesSelecionado)

    // Mostra toast de sucesso
    const total = lancamentos.length
    setSuccessMessage(`${total} lançamento${total > 1 ? 's' : ''} criado${total > 1 ? 's' : ''}!`)
  }

  // Configurações do usuário para auto-marcar concluído
  const autoMarcarConcluido = {
    entrada: Boolean(configuracoes.entradas_auto_recebido),
    saida: Boolean(configuracoes.saidas_auto_pago),
  }

  // Calcula a margem do conteúdo baseado no estado do sidebar
  const sidebarMargin = isDesktop
    ? isCollapsed
      ? SIDEBAR_WIDTH_COLLAPSED
      : SIDEBAR_WIDTH_EXPANDED
    : 0

  return (
    <div className="min-h-screen flex">
      {/* Navegação - Sidebar no desktop, bottom bar no mobile */}
      <NavigationBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setConfigDrawerOpen(true)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Container principal com margem animada para sidebar */}
      <motion.div
        className="flex-1"
        animate={{ marginLeft: sidebarMargin }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
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

      {/* Dialog de confirmação de exclusão (não recorrente) */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Excluir este item?"
        description={filhoSelecionado?.nome ?? lancamentoSelecionado?.nome ?? ''}
        onConfirm={handleConfirmDelete}
      />

      {/* Dialog de recorrência (edição ou exclusão em lote) */}
      <RecorrenciaActionDialog
        open={recorrenciaDialogOpen}
        onOpenChange={setRecorrenciaDialogOpen}
        lancamento={lancamentoSelecionado}
        action={recorrenciaAction}
        infoRecorrencia={infoRecorrencia}
        isLoading={isRecorrenciaLoading}
        onConfirm={handleRecorrenciaConfirm}
      />

      {/* Toast de erro */}
      <Toast
        message={error}
        onClose={limparErro}
        onRetry={() => carregarMes(mesSelecionado)}
      />

      {/* Toast de sucesso (store) */}
      <Toast
        message={success}
        onClose={limparSucesso}
        variant="success"
      />

      {/* Toast de sucesso (local - operações em lote) */}
      <Toast
        message={successMessage}
        onClose={() => setSuccessMessage(null)}
        variant="success"
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
      </motion.div>
    </div>
  )
}
