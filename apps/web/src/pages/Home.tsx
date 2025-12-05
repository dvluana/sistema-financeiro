/**
 * Home Page
 *
 * Tela principal do sistema financeiro.
 * Integra todos os componentes e gerencia o estado da aplicação.
 *
 * Funcionalidades:
 * - Exibição de entradas e saídas do mês
 * - Navegação entre meses
 * - Criação/edição/exclusão de lançamentos
 * - Marcar/desmarcar como pago/recebido
 * - Configurações do usuário
 * - Navegação por swipe (mobile)
 */

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { useFinanceiroStore } from '@/stores/useFinanceiroStore'
import { Header } from '@/components/Header'
import { CardEntradas } from '@/components/CardEntradas'
import { CardSaidas } from '@/components/CardSaidas'
import { CardResultado } from '@/components/CardResultado'
import { FormLancamento } from '@/components/FormLancamento'
import { ConfiguracaoDrawer } from '@/components/ConfiguracaoDrawer'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Toast } from '@/components/Toast'
import { ResponsiveDrawer, ResponsiveDrawerContent } from '@/components/ui/responsive-drawer'
import type { Lancamento } from '@/lib/api'
import type { FormLancamentoData } from '@/components/FormLancamento'

export function Home() {
  // Estado global
  const {
    mesAtual,
    entradas,
    saidas,
    totais,
    configuracoes,
    isLoading,
    error,
    irParaMesAnterior,
    irParaProximoMes,
    carregarMes,
    carregarConfiguracoes,
    criarLancamento,
    criarLancamentoRecorrente,
    atualizarLancamento,
    toggleConcluido,
    excluirLancamento,
    atualizarConfiguracao,
    limparErro,
  } = useFinanceiroStore()

  // Estado local para modais
  const [formDrawerOpen, setFormDrawerOpen] = useState(false)
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // Estado do formulário
  const [formTipo, setFormTipo] = useState<'entrada' | 'saida'>('entrada')
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null)

  // Direção da animação para navegação de mês
  const [slideDirection, setSlideDirection] = useState(0)

  /**
   * Carrega dados iniciais
   */
  useEffect(() => {
    carregarMes(mesAtual)
    carregarConfiguracoes()
  }, [])

  /**
   * Abre formulário para nova entrada
   */
  const handleAddEntrada = useCallback(() => {
    setFormTipo('entrada')
    setLancamentoSelecionado(null)
    setFormDrawerOpen(true)
  }, [])

  /**
   * Abre formulário para nova saída
   */
  const handleAddSaida = useCallback(() => {
    setFormTipo('saida')
    setLancamentoSelecionado(null)
    setFormDrawerOpen(true)
  }, [])

  /**
   * Abre formulário para editar lançamento
   */
  const handleEditLancamento = useCallback((lancamento: Lancamento) => {
    setFormTipo(lancamento.tipo)
    setLancamentoSelecionado(lancamento)
    setFormDrawerOpen(true)
  }, [])

  /**
   * Submete o formulário (criar ou atualizar)
   */
  const handleFormSubmit = async (data: FormLancamentoData) => {
    try {
      if (lancamentoSelecionado) {
        // Atualizar
        await atualizarLancamento(lancamentoSelecionado.id, {
          nome: data.nome,
          valor: data.valor,
          data_prevista: data.data_prevista,
          concluido: data.concluido,
          categoria_id: data.categoria_id,
        })
      } else if (data.recorrencia) {
        // Criar lançamentos recorrentes
        const diaPrevisto = data.data_prevista
          ? parseInt(data.data_prevista.split('-')[2], 10)
          : null
        await criarLancamentoRecorrente({
          tipo: formTipo,
          nome: data.nome,
          valor: data.valor,
          mes_inicial: mesAtual,
          dia_previsto: diaPrevisto,
          concluido: data.concluido,
          categoria_id: data.categoria_id,
          recorrencia: data.recorrencia,
        })
      } else {
        // Criar lançamento único
        await criarLancamento({
          tipo: formTipo,
          nome: data.nome,
          valor: data.valor,
          mes: mesAtual,
          concluido: data.concluido,
          data_prevista: data.data_prevista,
          categoria_id: data.categoria_id,
        })
      }
      setFormDrawerOpen(false)
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
        setFormDrawerOpen(false)
      } catch {
        // Erro já tratado na store
      }
    }
  }

  /**
   * Navegação por swipe (mobile)
   */
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    if (info.offset.x > threshold) {
      setSlideDirection(-1)
      irParaMesAnterior()
    } else if (info.offset.x < -threshold) {
      setSlideDirection(1)
      irParaProximoMes()
    }
  }

  /**
   * Navegação por botões
   */
  const handleMesAnterior = () => {
    setSlideDirection(-1)
    irParaMesAnterior()
  }

  const handleProximoMes = () => {
    setSlideDirection(1)
    irParaProximoMes()
  }

  // Configurações do usuário
  const mostrarConcluidosDiscretos = Boolean(configuracoes.mostrar_concluidos_discretos)
  const autoMarcarConcluido = formTipo === 'entrada'
    ? Boolean(configuracoes.entradas_auto_recebido)
    : Boolean(configuracoes.saidas_auto_pago)

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutro-100 to-neutro-200">
      {/* Header */}
      <Header
        mes={mesAtual}
        onMesAnterior={handleMesAnterior}
        onProximoMes={handleProximoMes}
        onOpenConfig={() => setConfigDrawerOpen(true)}
      />

      {/* Conteúdo principal */}
      <main className="max-w-[720px] mx-auto pb-8">
        {isLoading && !totais ? (
          <LoadingSkeleton />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mesAtual}
              initial={{ x: slideDirection * 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: slideDirection * -100, opacity: 0 }}
              transition={{ duration: 0.15 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              className="p-4 space-y-4"
            >
              {/* Card Entradas */}
              <CardEntradas
                entradas={entradas}
                jaEntrou={totais?.jaEntrou ?? 0}
                faltaEntrar={totais?.faltaEntrar ?? 0}
                mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                onToggle={toggleConcluido}
                onEdit={handleEditLancamento}
                onAdd={handleAddEntrada}
              />

              {/* Card Saídas */}
              <CardSaidas
                saidas={saidas}
                jaPaguei={totais?.jaPaguei ?? 0}
                faltaPagar={totais?.faltaPagar ?? 0}
                mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                onToggle={toggleConcluido}
                onEdit={handleEditLancamento}
                onAdd={handleAddSaida}
              />

              {/* Card Resultado */}
              <CardResultado
                totalEntradas={totais?.entradas ?? 0}
                totalSaidas={totais?.saidas ?? 0}
                saldo={totais?.saldo ?? 0}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Drawer do formulário (responsivo: lateral em desktop, bottom em mobile) */}
      <ResponsiveDrawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <ResponsiveDrawerContent>
          <FormLancamento
            tipo={formTipo}
            mesAtual={mesAtual}
            lancamento={lancamentoSelecionado}
            autoMarcarConcluido={autoMarcarConcluido}
            onSubmit={handleFormSubmit}
            onDelete={lancamentoSelecionado ? handleDeleteClick : undefined}
            isLoading={isLoading}
          />
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>

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
    </div>
  )
}
