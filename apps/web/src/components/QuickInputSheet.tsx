/**
 * QuickInputSheet Component
 *
 * Bottomsheet para lançamento rápido por texto.
 * Permite ao usuário digitar lançamentos de forma natural e confirmar antes de salvar.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import {
  parseInput,
  formatarValor,
  formatarMesExibicao,
  agruparRecorrencias,
  type ParsedLancamento,
} from '@/lib/parser'

// Chave do localStorage para histórico
const HISTORICO_KEY = 'quick-input-historico'
const MAX_HISTORICO = 5

interface QuickInputSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mesAtual: string
  onConfirm: (lancamentos: ParsedLancamento[]) => Promise<void>
}

export function QuickInputSheet({
  open,
  onOpenChange,
  mesAtual,
  onConfirm,
}: QuickInputSheetProps) {
  // Estado do input
  const [texto, setTexto] = useState('')
  const [lancamentos, setLancamentos] = useState<ParsedLancamento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Histórico de inputs
  const [historico, setHistorico] = useState<string[]>([])

  // Grupos expandidos (para recorrências)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Ref para o textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Carrega histórico do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORICO_KEY)
      if (saved) {
        setHistorico(JSON.parse(saved))
      }
    } catch {
      // Ignora erros de parse
    }
  }, [])

  // Foca no input quando abre
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  // Limpa estado quando fecha
  useEffect(() => {
    if (!open) {
      setTexto('')
      setLancamentos([])
      setExpandedGroups(new Set())
      setErro(null)
    }
  }, [open])

  /**
   * Processa o texto digitado
   */
  const handleSubmitTexto = useCallback(() => {
    if (!texto.trim()) return

    const result = parseInput(texto, mesAtual)
    setLancamentos(result.lancamentos)
    setErro(null)
  }, [texto, mesAtual])

  /**
   * Atualiza campo de um lançamento incompleto
   */
  const handleUpdateLancamento = useCallback(
    (id: string, campo: 'valor' | 'nome', valor: string) => {
      setLancamentos((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l

          const updated = { ...l }
          if (campo === 'valor') {
            const valorNumerico = parseFloat(valor.replace(/[^\d.,]/g, '').replace(',', '.'))
            updated.valor = isNaN(valorNumerico) ? null : valorNumerico
          } else {
            updated.nome = valor
          }

          // Recalcula status
          const camposFaltantes: ('valor' | 'nome')[] = []
          if (updated.valor === null) camposFaltantes.push('valor')
          if (!updated.nome) camposFaltantes.push('nome')
          updated.camposFaltantes = camposFaltantes
          updated.status = camposFaltantes.length > 0 ? 'incompleto' : 'completo'

          return updated
        })
      )
    },
    []
  )

  /**
   * Alterna tipo do lançamento
   */
  const handleToggleTipo = useCallback((id: string) => {
    setLancamentos((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        return { ...l, tipo: l.tipo === 'entrada' ? 'saida' : 'entrada' }
      })
    )
  }, [])

  /**
   * Remove lançamento da lista
   */
  const handleRemoveLancamento = useCallback((id: string) => {
    setLancamentos((prev) => prev.filter((l) => l.id !== id))
  }, [])

  /**
   * Expande/colapsa grupo de recorrência
   */
  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  /**
   * Salva no histórico
   */
  const salvarHistorico = useCallback((input: string) => {
    setHistorico((prev) => {
      // Remove duplicatas e adiciona no início
      const filtered = prev.filter((h) => h !== input)
      const next = [input, ...filtered].slice(0, MAX_HISTORICO)
      localStorage.setItem(HISTORICO_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  /**
   * Confirma e cria os lançamentos
   */
  const handleConfirm = async () => {
    // Verifica se todos estão completos
    const incompletos = lancamentos.filter((l) => l.status === 'incompleto')
    if (incompletos.length > 0) {
      setErro('Preencha todos os campos obrigatórios')
      return
    }

    if (lancamentos.length === 0) {
      setErro('Nenhum lançamento para criar')
      return
    }

    setIsLoading(true)
    setErro(null)

    try {
      await onConfirm(lancamentos)
      salvarHistorico(texto)
      onOpenChange(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar lançamentos')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Usa sugestão do histórico
   */
  const handleUseSugestao = useCallback((sugestao: string) => {
    setTexto(sugestao)
    textareaRef.current?.focus()
  }, [])

  // Agrupa lançamentos para exibição
  const grupos = agruparRecorrencias(lancamentos)

  // Conta total de lançamentos
  const totalLancamentos = lancamentos.length

  // Verifica se pode confirmar
  const temIncompletos = lancamentos.some((l) => l.status === 'incompleto')
  const podeConfirmar = lancamentos.length > 0 && !temIncompletos && !isLoading

  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DrawerPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-bottomsheet border-t border-neutro-300"
          style={{ maxHeight: '90vh' }}
        >
          {/* Handle de arraste */}
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-neutro-300" />

          {/* Conteúdo */}
          <div className="flex flex-col flex-1 overflow-hidden p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <DrawerPrimitive.Title className="text-titulo-card text-neutro-900">
                Lançamento Rápido
              </DrawerPrimitive.Title>
              <DrawerPrimitive.Close className="p-2 -mr-2 text-neutro-400 hover:text-neutro-600">
                <X className="w-5 h-5" />
              </DrawerPrimitive.Close>
            </div>

            {/* Campo de Input */}
            <div className="relative mb-4">
              <textarea
                ref={textareaRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitTexto()
                  }
                }}
                placeholder="Ex: Salário 5000 dia 5&#10;Parcela carro 800 out/25 até dez/25"
                className={cn(
                  'w-full resize-none rounded-lg border border-neutro-300 bg-white p-3 pr-12',
                  'text-corpo text-neutro-900 placeholder:text-neutro-400',
                  'focus:outline-none focus:ring-2 focus:ring-rosa focus:border-transparent',
                  'min-h-[60px] max-h-[120px]'
                )}
                rows={2}
              />
              <button
                type="button"
                onClick={handleSubmitTexto}
                disabled={!texto.trim()}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full',
                  'transition-colors',
                  texto.trim()
                    ? 'text-rosa hover:bg-rosa/10'
                    : 'text-neutro-300 cursor-not-allowed'
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Sugestões do histórico */}
            {historico.length > 0 && lancamentos.length === 0 && !texto && (
              <div className="mb-4">
                <p className="text-micro text-neutro-400 mb-2">Recentes:</p>
                <div className="flex flex-wrap gap-2">
                  {historico.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleUseSugestao(h)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-micro',
                        'bg-neutro-100 text-neutro-600 hover:bg-neutro-200',
                        'truncate max-w-[200px]'
                      )}
                    >
                      {h.split('\n')[0]}
                      {h.includes('\n') && '...'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de lançamentos interpretados */}
            <div className="flex-1 overflow-y-auto -mx-4 px-4">
              <AnimatePresence mode="popLayout">
                {Array.from(grupos.entries()).map(([key, items]) => {
                  const isRecorrencia = items.length > 1
                  const isExpanded = expandedGroups.has(key)
                  const primeiro = items[0]

                  return (
                    <motion.div
                      key={key}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className={cn(
                        'rounded-lg border mb-2',
                        primeiro.status === 'incompleto'
                          ? 'border-vermelho bg-vermelho/5'
                          : 'border-neutro-200 bg-white'
                      )}
                    >
                      {/* Header do grupo */}
                      <div className="flex items-center gap-3 p-3">
                        {/* Ícone de tipo (clicável para alternar) */}
                        <button
                          type="button"
                          onClick={() => {
                            // Alterna todos do grupo
                            items.forEach((item) => handleToggleTipo(item.id))
                          }}
                          className="shrink-0"
                          title="Alternar tipo"
                        >
                          {primeiro.tipo === 'entrada' ? (
                            <ArrowUpCircle className="w-6 h-6 text-verde" />
                          ) : (
                            <ArrowDownCircle className="w-6 h-6 text-vermelho" />
                          )}
                        </button>

                        {/* Nome e valor */}
                        <div className="flex-1 min-w-0">
                          {primeiro.camposFaltantes.includes('nome') ? (
                            <input
                              type="text"
                              value={primeiro.nome}
                              onChange={(e) =>
                                items.forEach((item) =>
                                  handleUpdateLancamento(item.id, 'nome', e.target.value)
                                )
                              }
                              placeholder="Nome do lançamento"
                              className="w-full text-corpo text-neutro-900 bg-transparent border-b border-vermelho focus:outline-none focus:border-rosa"
                            />
                          ) : (
                            <span className="text-corpo text-neutro-900 truncate block">
                              {primeiro.nome}
                            </span>
                          )}
                        </div>

                        {/* Valor */}
                        <div className="shrink-0">
                          {primeiro.camposFaltantes.includes('valor') ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={primeiro.valor !== null ? String(primeiro.valor) : ''}
                              onChange={(e) =>
                                items.forEach((item) =>
                                  handleUpdateLancamento(item.id, 'valor', e.target.value)
                                )
                              }
                              placeholder="R$ 0,00"
                              className="w-24 text-right text-corpo-medium text-neutro-900 bg-transparent border-b border-vermelho focus:outline-none focus:border-rosa"
                            />
                          ) : (
                            <span className="text-corpo-medium text-neutro-900">
                              {formatarValor(primeiro.valor)}
                            </span>
                          )}
                        </div>

                        {/* Badge de meses ou botão de expandir */}
                        {isRecorrencia ? (
                          <button
                            type="button"
                            onClick={() => toggleGroup(key)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-neutro-100 text-micro text-neutro-600"
                          >
                            {items.length} meses
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        ) : (
                          <span className="text-micro text-neutro-400">
                            {formatarMesExibicao(primeiro.mes)}
                          </span>
                        )}

                        {/* Botão remover */}
                        <button
                          type="button"
                          onClick={() => items.forEach((item) => handleRemoveLancamento(item.id))}
                          className="shrink-0 p-1 text-neutro-400 hover:text-vermelho"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Meses expandidos */}
                      <AnimatePresence>
                        {isRecorrencia && isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-neutro-200 p-3 pt-2">
                              <div className="flex flex-wrap gap-2">
                                {items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-2 px-2 py-1 rounded bg-neutro-50 text-micro"
                                  >
                                    <span className="text-neutro-600">
                                      {formatarMesExibicao(item.mes)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLancamento(item.id)}
                                      className="text-neutro-400 hover:text-vermelho"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Mensagem de erro */}
              {erro && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-vermelho/10 text-vermelho text-corpo mb-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {erro}
                </div>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-4 mt-auto border-t border-neutro-200 pb-safe">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleConfirm}
                disabled={!podeConfirmar}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  `Lançar ${totalLancamentos} ${totalLancamentos === 1 ? 'item' : 'itens'}`
                )}
              </Button>
            </div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}
