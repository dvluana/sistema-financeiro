/**
 * Home Page
 *
 * Container principal com navegação entre Dashboard e Mês.
 * Gerencia estado compartilhado entre as duas views.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinanceiroStore } from '@/stores/useFinanceiroStore'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { BottomTabBar, type TabType } from '@/components/BottomTabBar'
import { Dashboard } from './Dashboard'
import { MesView, type FiltroPendentes } from './MesView'
import { LancamentoSheet, type LancamentoFormData } from '@/components/LancamentoSheet'
import { ConfiguracaoDrawer } from '@/components/ConfiguracaoDrawer'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Toast } from '@/components/Toast'
import { QuickInputSheet } from '@/components/QuickInputSheet'
import { AddFAB } from '@/components/AddFAB'
import type { Lancamento, CriarLancamentoInput } from '@/lib/api'
import type { ParsedLancamento } from '@/lib/parser'

export function Home() {
  // Tab ativo
  const [activeTab, setActiveTab] = useState<TabType>('inicio')

  // Filtro de pendentes (quando vem da dashboard)
  const [filtroPendentes, setFiltroPendentes] = useState<FiltroPendentes>(null)

  // Estado global financeiro
  const {
    mesAtual,
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
  const { carregarDashboard } = useDashboardStore()

  // Estado local para modais
  const [lancamentoSheetOpen, setLancamentoSheetOpen] = useState(false)
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [quickInputOpen, setQuickInputOpen] = useState(false)

  // Estado do formulário
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null)
  const [tipoInicial, setTipoInicial] = useState<'entrada' | 'saida'>('saida')

  /**
   * Navegação da dashboard para a tela de mês
   */
  const handleNavigateToMes = useCallback((filtro?: 'pendentes-entrada' | 'pendentes-saida') => {
    setFiltroPendentes(filtro ?? null)
    setActiveTab('mes')
  }, [])

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
          mes_inicial: mesAtual,
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
          mes: mesAtual,
          concluido: data.concluido,
          data_prevista: data.data_prevista,
          categoria_id: data.categoria_id,
        })
      }
      setLancamentoSheetOpen(false)
      // Recarrega dashboard se estiver na aba início
      if (activeTab === 'inicio') {
        carregarDashboard()
      }
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
        // Recarrega dashboard se estiver na aba início
        if (activeTab === 'inicio') {
          carregarDashboard()
        }
      } catch {
        // Erro já tratado na store
      }
    }
  }

  /**
   * Confirma lançamentos do Quick Input
   */
  const handleQuickInputConfirm = async (lancamentos: ParsedLancamento[]) => {
    // Cria todos os lançamentos em paralelo
    const promises: Promise<void>[] = []

    for (const l of lancamentos) {
      const data: CriarLancamentoInput = {
        tipo: l.tipo,
        nome: l.nome,
        valor: l.valor!,
        mes: l.mes,
        concluido: false,
        data_prevista: l.diaPrevisto
          ? `${l.mes}-${String(l.diaPrevisto).padStart(2, '0')}`
          : null,
        categoria_id: null,
      }

      promises.push(
        criarLancamento(data).then(() => {
          // Lançamento criado
        })
      )
    }

    await Promise.all(promises)

    // Recarrega dados
    await carregarMes(mesAtual)
    if (activeTab === 'inicio') {
      carregarDashboard()
    }
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
        {activeTab === 'inicio' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Dashboard
              onNavigateToMes={handleNavigateToMes}
              onOpenConfig={() => setConfigDrawerOpen(true)}
              onEditLancamento={handleEditLancamento}
              onNovoLancamento={handleOpenManualInput}
            />
          </motion.div>
        ) : (
          <motion.div
            key="mes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <MesView
              filtro={filtroPendentes}
              onFiltroChange={setFiltroPendentes}
              onOpenConfig={() => setConfigDrawerOpen(true)}
              onEditLancamento={handleEditLancamento}
              onAddEntrada={handleAddEntrada}
              onAddSaida={handleAddSaida}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Drawer de lançamento manual */}
      <LancamentoSheet
        open={lancamentoSheetOpen}
        onOpenChange={setLancamentoSheetOpen}
        mesAtual={mesAtual}
        lancamento={lancamentoSelecionado}
        tipoInicial={tipoInicial}
        autoMarcarConcluido={autoMarcarConcluido}
        onSubmit={handleFormSubmit}
        onDelete={lancamentoSelecionado ? handleDeleteClick : undefined}
        isLoading={isLoading}
      />

      {/* Drawer de configurações */}
      <ConfiguracaoDrawer
        open={configDrawerOpen}
        onOpenChange={setConfigDrawerOpen}
        configuracoes={configuracoes}
        onUpdateConfig={atualizarConfiguracao}
      />

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
        onRetry={() => carregarMes(mesAtual)}
      />

      {/* FAB com menu de opções */}
      <AddFAB
        onQuickInput={() => setQuickInputOpen(true)}
        onManualInput={handleOpenManualInput}
        className="bottom-24 right-4"
      />

      {/* Sheet de lançamento rápido */}
      <QuickInputSheet
        open={quickInputOpen}
        onOpenChange={setQuickInputOpen}
        mesAtual={mesAtual}
        onConfirm={handleQuickInputConfirm}
      />
    </div>
  )
}
