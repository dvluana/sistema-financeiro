/**
 * QuickInputSheet Component
 *
 * Drawer/Bottomsheet responsivo para lançamento rápido por texto.
 * - Desktop/tablets grandes: Drawer lateral direito
 * - Mobile/tablets pequenos: Bottomsheet
 *
 * Permite ao usuário digitar lançamentos de forma natural e confirmar antes de salvar.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  Loader2,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { useIsDesktop } from '@/hooks/useMediaQuery'
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
  const isDesktop = useIsDesktop()

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

  // Componente do card de lançamento (para reutilizar)
  const LancamentoCard = ({ items, groupKey }: { items: ParsedLancamento[]; groupKey: string }) => {
    const isRecorrencia = items.length > 1
    const isExpanded = expandedGroups.has(groupKey)
    const primeiro = items[0]
    const isEntrada = primeiro.tipo === 'entrada'

    return (
      <motion.div
        key={groupKey}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className={cn(
          'rounded-xl border-2 mb-3 overflow-hidden transition-colors',
          primeiro.status === 'incompleto'
            ? 'border-vermelho/50 bg-vermelho/5'
            : isEntrada
            ? 'border-verde/30 bg-verde/5'
            : 'border-vermelho/30 bg-vermelho/5'
        )}
      >
        {/* Header do grupo */}
        <div className="flex items-center gap-3 p-3">
          {/* Badge de tipo (clicável para alternar) */}
          <button
            type="button"
            onClick={() => {
              items.forEach((item) => handleToggleTipo(item.id))
            }}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-micro font-medium transition-all',
              'hover:scale-105 active:scale-95',
              isEntrada
                ? 'bg-verde text-white'
                : 'bg-vermelho text-white'
            )}
            title={`Clique para mudar para ${isEntrada ? 'saída' : 'entrada'}`}
          >
            {isEntrada ? (
              <>
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Entrada</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saída</span>
              </>
            )}
          </button>

          {/* Nome */}
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
                className={cn(
                  'w-full text-corpo text-neutro-900 bg-white/50 rounded-lg px-3 py-1.5',
                  'border border-vermelho/50 focus:outline-none focus:ring-2 focus:ring-rosa focus:border-transparent'
                )}
              />
            ) : (
              <span className="text-corpo font-medium text-neutro-900 truncate block">
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
                className={cn(
                  'w-28 text-right text-corpo-medium text-neutro-900 bg-white/50 rounded-lg px-3 py-1.5',
                  'border border-vermelho/50 focus:outline-none focus:ring-2 focus:ring-rosa focus:border-transparent'
                )}
              />
            ) : (
              <span className={cn(
                'text-corpo-medium font-semibold',
                isEntrada ? 'text-verde' : 'text-vermelho'
              )}>
                {formatarValor(primeiro.valor)}
              </span>
            )}
          </div>
        </div>

        {/* Linha de info secundária */}
        <div className="flex items-center gap-2 px-3 pb-3 -mt-1">
          {/* Badge de meses ou mês único */}
          {isRecorrencia ? (
            <button
              type="button"
              onClick={() => toggleGroup(groupKey)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-micro font-medium transition-colors',
                'bg-white/60 text-neutro-600 hover:bg-white'
              )}
            >
              {items.length} meses
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="px-2 py-1 rounded-md bg-white/60 text-micro text-neutro-500">
              {formatarMesExibicao(primeiro.mes)}
            </span>
          )}

          {/* Dia previsto */}
          {primeiro.diaPrevisto && (
            <span className="px-2 py-1 rounded-md bg-white/60 text-micro text-neutro-500">
              Dia {primeiro.diaPrevisto}
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Botão remover */}
          <button
            type="button"
            onClick={() => items.forEach((item) => handleRemoveLancamento(item.id))}
            className="p-1.5 rounded-md text-neutro-400 hover:text-vermelho hover:bg-white/60 transition-colors"
            title="Remover"
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
              <div className="border-t border-neutro-200/50 bg-white/30 p-3">
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white text-micro shadow-sm"
                    >
                      <span className="text-neutro-700 font-medium">
                        {formatarMesExibicao(item.mes)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLancamento(item.id)}
                        className="text-neutro-400 hover:text-vermelho transition-colors"
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
  }

  // Conteúdo compartilhado entre drawer e bottomsheet
  const sharedContent = (
    <div className={cn(
      'flex flex-col h-full',
      isDesktop ? 'p-6' : 'p-4'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl',
          'bg-gradient-to-br from-rosa to-rosa/80 text-white shadow-sm'
        )}>
          <Zap className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <DrawerPrimitive.Title className="text-titulo-card text-neutro-900">
            Lançamento Rápido
          </DrawerPrimitive.Title>
          <p className="text-micro text-neutro-400">
            Digite de forma natural, ex: "salário 5000 dia 5"
          </p>
        </div>
        <DrawerPrimitive.Close className="p-2 -mr-2 rounded-lg text-neutro-400 hover:text-neutro-600 hover:bg-neutro-100 transition-colors">
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
          placeholder="Ex: Salário 5000 dia 5&#10;Parcela carro 800 out/25 até dez/25&#10;Aluguel 1500 por 12 meses"
          className={cn(
            'w-full resize-none rounded-xl border-2 border-neutro-200 bg-neutro-50 p-4 pr-14',
            'text-corpo text-neutro-900 placeholder:text-neutro-400',
            'focus:outline-none focus:ring-2 focus:ring-rosa/20 focus:border-rosa focus:bg-white',
            'transition-all',
            isDesktop ? 'min-h-[100px]' : 'min-h-[80px]',
            'max-h-[160px]'
          )}
          rows={3}
        />
        <button
          type="button"
          onClick={handleSubmitTexto}
          disabled={!texto.trim()}
          className={cn(
            'absolute right-3 bottom-3 p-2.5 rounded-xl',
            'transition-all',
            texto.trim()
              ? 'bg-rosa text-white hover:bg-rosa/90 shadow-sm hover:shadow active:scale-95'
              : 'bg-neutro-200 text-neutro-400 cursor-not-allowed'
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
                  'px-3 py-1.5 rounded-lg text-micro font-medium',
                  'bg-neutro-100 text-neutro-600 hover:bg-neutro-200',
                  'truncate max-w-[200px] transition-colors'
                )}
              >
                {h.split('\n')[0]}
                {h.includes('\n') && '...'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dica de tipos */}
      {lancamentos.length === 0 && !texto && (
        <div className="mb-4 p-3 rounded-xl bg-neutro-50 border border-neutro-200">
          <p className="text-micro text-neutro-500 mb-2">Palavras que identificam o tipo:</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-verde/10 text-verde text-micro">
              <TrendingUp className="w-3 h-3" />
              salário, recebi, freelance, venda...
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-vermelho/10 text-vermelho text-micro">
              <TrendingDown className="w-3 h-3" />
              paguei, conta, parcela, aluguel...
            </span>
          </div>
        </div>
      )}

      {/* Lista de lançamentos interpretados */}
      <div className={cn(
        'flex-1 overflow-y-auto -mx-4 px-4',
        isDesktop && '-mx-6 px-6'
      )}>
        <AnimatePresence mode="popLayout">
          {Array.from(grupos.entries()).map(([key, items]) => (
            <LancamentoCard key={key} items={items} groupKey={key} />
          ))}
        </AnimatePresence>

        {/* Mensagem de erro */}
        {erro && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-vermelho/10 text-vermelho text-corpo mb-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {erro}
          </motion.div>
        )}
      </div>

      {/* Botões de ação */}
      <div className={cn(
        'flex gap-3 pt-4 mt-auto border-t border-neutro-200',
        !isDesktop && 'pb-safe'
      )}>
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
  )

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={isDesktop ? 'right' : 'bottom'}
      shouldScaleBackground={!isDesktop}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DrawerPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col bg-white',
            isDesktop
              ? // Drawer lateral (desktop/tablets grandes)
                'inset-y-0 right-0 h-full w-full max-w-lg border-l border-neutro-200 rounded-l-2xl shadow-xl'
              : // Bottomsheet (mobile/tablets pequenos)
                'inset-x-0 bottom-0 rounded-t-2xl border-t border-neutro-200 shadow-xl'
          )}
          style={!isDesktop ? { maxHeight: '90vh' } : undefined}
        >
          {/* Handle de arraste apenas no mobile */}
          {!isDesktop && (
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-neutro-300" />
          )}

          {sharedContent}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}
