/**
 * QuickInputSheet Component
 *
 * Input moderno para lançamento rápido com IA.
 * Design clean e minimalista com UX clara que é powered by AI.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
  Sparkles,
  Mic,
  MicOff,
  Check,
  ChevronDown,
  ChevronUp,
  Repeat,
  Trash2,
  Wand2,
} from 'lucide-react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { aiApi, getCategoriasPadraoByTipo } from '@/lib/api'
import {
  formatarValor,
  formatarMesExibicao,
  gerarListaMeses,
  extrairMesGlobal,
  type ParsedLancamento,
} from '@/lib/parser'

// Props do card de lançamento compacto
interface LancamentoItemProps {
  item: ParsedLancamento
  onToggleTipo: (id: string) => void
  onUpdateLancamento: (id: string, campo: 'valor' | 'nome' | 'mes', valor: string) => void
  onUpdateRecorrencia: (id: string, recorrencia: ParsedLancamento['recorrencia']) => void
  onUpdateCategoria: (id: string, categoriaId: string | null) => void
  onRemoveLancamento: (id: string) => void
  mesesDisponiveis: Array<{ value: string; label: string }>
}

// Componente de item individual - ultra compacto
const LancamentoItem = React.memo(function LancamentoItem({
  item,
  onToggleTipo,
  onUpdateLancamento,
  onUpdateRecorrencia,
  onUpdateCategoria,
  onRemoveLancamento,
  mesesDisponiveis,
}: LancamentoItemProps) {
  const isEntrada = item.tipo === 'entrada'
  const temRecorrencia = !!item.recorrencia
  const [showOptions, setShowOptions] = useState(false)

  // Obtém categoria atual
  const categoriasDoTipo = getCategoriasPadraoByTipo(item.tipo)

  // Formata valor para exibição
  const valorFormatado = item.valor !== null
    ? item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    : ''

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.15 }}
      className="group"
    >
      <div className={cn(
        'flex items-center gap-2 py-2.5 px-3 rounded-xl',
        'bg-secondary/50 border border-transparent',
        'hover:border-border/50 transition-all',
      )}>
        {/* Indicador de tipo - clicável */}
        <button
          type="button"
          onClick={() => onToggleTipo(item.id)}
          className={cn(
            'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
            'transition-all hover:scale-105 active:scale-95',
            isEntrada
              ? 'bg-verde/15 text-verde'
              : 'bg-vermelho/15 text-vermelho'
          )}
          title={isEntrada ? 'Entrada' : 'Saída'}
        >
          {isEntrada ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
        </button>

        {/* Nome */}
        <input
          type="text"
          value={item.nome}
          onChange={(e) => onUpdateLancamento(item.id, 'nome', e.target.value)}
          placeholder="Descrição"
          className={cn(
            'flex-1 min-w-0 bg-transparent text-corpo',
            'focus:outline-none placeholder:text-muted-foreground/40',
          )}
        />

        {/* Valor */}
        <div className={cn(
          'shrink-0 flex items-center',
          isEntrada ? 'text-verde' : 'text-vermelho'
        )}>
          <span className="text-micro opacity-50 mr-0.5">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={valorFormatado}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d.,]/g, '')
              onUpdateLancamento(item.id, 'valor', raw)
            }}
            placeholder="0,00"
            className={cn(
              'w-20 text-right bg-transparent text-corpo font-medium tabular-nums',
              'focus:outline-none placeholder:text-current placeholder:opacity-30',
              isEntrada ? 'text-verde' : 'text-vermelho',
            )}
          />
        </div>

        {/* Mais opções */}
        <button
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          className={cn(
            'shrink-0 p-1.5 rounded-lg transition-colors',
            showOptions
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground/40 hover:text-muted-foreground'
          )}
        >
          {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Remover */}
        <button
          type="button"
          onClick={() => onRemoveLancamento(item.id)}
          className={cn(
            'shrink-0 p-1.5 rounded-lg transition-colors',
            'text-muted-foreground/30 hover:text-vermelho hover:bg-vermelho/10'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Opções expandidas */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 mt-1 rounded-xl bg-accent/30">
              {/* Mês */}
              <select
                value={item.mes}
                onChange={(e) => onUpdateLancamento(item.id, 'mes', e.target.value)}
                className={cn(
                  'bg-card border border-border rounded-lg px-2 py-1',
                  'text-micro text-foreground cursor-pointer focus:outline-none',
                )}
              >
                {mesesDisponiveis.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {formatarMesExibicao(mes.value)}
                  </option>
                ))}
              </select>

              {/* Categoria */}
              <select
                value={item.categoriaId || ''}
                onChange={(e) => onUpdateCategoria(item.id, e.target.value || null)}
                className={cn(
                  'bg-card border border-border rounded-lg px-2 py-1',
                  'text-micro text-foreground cursor-pointer focus:outline-none',
                )}
              >
                <option value="">Sem categoria</option>
                {categoriasDoTipo.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>

              {/* Recorrência */}
              <button
                type="button"
                onClick={() => {
                  if (temRecorrencia) {
                    onUpdateRecorrencia(item.id, undefined)
                  } else {
                    onUpdateRecorrencia(item.id, { tipo: 'mensal', quantidade: 12 })
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-micro',
                  'transition-colors',
                  temRecorrencia
                    ? 'bg-rosa/15 text-rosa'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <Repeat className="w-3 h-3" />
                {temRecorrencia ? 'Mensal' : 'Repetir'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

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
  const [isParsing, setIsParsing] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Estado do reconhecimento de voz
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Ref para o input
  const inputRef = useRef<HTMLInputElement>(null)

  // Verifica suporte a Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(!!SpeechRecognition)
  }, [])

  // Foca no input quando abre
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Limpa estado quando fecha
  useEffect(() => {
    if (!open) {
      setTexto('')
      setLancamentos([])
      setErro(null)
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        setIsListening(false)
      }
    }
  }, [open])

  /**
   * Inicia/para reconhecimento de voz
   */
  const toggleVoiceRecognition = useCallback(() => {
    if (!speechSupported) {
      setErro('Navegador não suporta reconhecimento de voz')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListening(true)
      setErro(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        }
      }
      if (finalTranscript) {
        setTexto(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false)
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setErro('Erro no microfone. Tente novamente.')
      }
    }

    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setIsListening(false)
    }
  }, [speechSupported, isListening])

  /**
   * Processa texto com IA
   */
  const handleProcess = useCallback(async () => {
    if (!texto.trim()) return

    setIsParsing(true)
    setErro(null)

    try {
      const mesGlobal = extrairMesGlobal(texto)
      const mesParaUsar = mesGlobal?.mes || mesAtual
      const result = await aiApi.parseLancamentos(texto, mesParaUsar)

      if (result.erro) {
        setErro(result.erro)
        return
      }

      if (result.lancamentos.length === 0) {
        setErro('Não consegui entender. Tente algo como: "Netflix 55,90" ou "salário 5000"')
        return
      }

      const timestamp = Date.now()
      const novos: ParsedLancamento[] = result.lancamentos.map((l, i) => ({
        id: `ia-${timestamp}-${i}`,
        tipo: l.tipo,
        nome: l.nome,
        valor: l.valor,
        mes: mesParaUsar,
        diaPrevisto: l.diaPrevisto,
        categoriaId: l.categoriaId,
        status: 'completo' as const,
        camposFaltantes: [],
        groupId: `ia-${timestamp}-${i}`,
      }))

      setLancamentos(prev => [...prev, ...novos])
      setTexto('')
    } catch {
      setErro('Erro ao processar. Tente novamente.')
    } finally {
      setIsParsing(false)
    }
  }, [texto, mesAtual])

  // Handlers para atualizar lançamentos
  const handleUpdateLancamento = useCallback(
    (id: string, campo: 'valor' | 'nome' | 'mes', valor: string) => {
      setLancamentos(prev =>
        prev.map(l => {
          if (l.id !== id) return l
          const updated = { ...l }
          if (campo === 'valor') {
            const num = parseFloat(valor.replace(/[^\d.,]/g, '').replace(',', '.'))
            updated.valor = isNaN(num) ? null : num
          } else if (campo === 'mes') {
            updated.mes = valor
          } else {
            updated.nome = valor
          }
          return updated
        })
      )
    },
    []
  )

  const handleToggleTipo = useCallback((id: string) => {
    setLancamentos(prev =>
      prev.map(l => l.id === id ? { ...l, tipo: l.tipo === 'entrada' ? 'saida' : 'entrada' } : l)
    )
  }, [])

  const handleRemove = useCallback((id: string) => {
    setLancamentos(prev => prev.filter(l => l.id !== id))
  }, [])

  const handleUpdateRecorrencia = useCallback(
    (id: string, recorrencia: ParsedLancamento['recorrencia']) => {
      setLancamentos(prev => prev.map(l => l.id === id ? { ...l, recorrencia } : l))
    },
    []
  )

  const handleUpdateCategoria = useCallback(
    (id: string, categoriaId: string | null) => {
      setLancamentos(prev => prev.map(l => l.id === id ? { ...l, categoriaId } : l))
    },
    []
  )

  const handleClearAll = useCallback(() => {
    setLancamentos([])
    setErro(null)
  }, [])

  /**
   * Confirma lançamentos
   */
  const handleConfirm = async () => {
    if (lancamentos.length === 0) return

    const incompletos = lancamentos.filter(l => !l.nome || !l.valor)
    if (incompletos.length > 0) {
      setErro('Preencha nome e valor de todos os itens')
      return
    }

    setIsLoading(true)
    setErro(null)

    try {
      await onConfirm(lancamentos)
      onOpenChange(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setIsLoading(false)
    }
  }

  // Lista de meses disponíveis
  const mesesDisponiveis = useMemo(() => gerarListaMeses(), [])

  // Totais
  const totais = useMemo(() => {
    const entradas = lancamentos.filter(l => l.tipo === 'entrada' && l.valor).reduce((s, l) => s + (l.valor || 0), 0)
    const saidas = lancamentos.filter(l => l.tipo === 'saida' && l.valor).reduce((s, l) => s + (l.valor || 0), 0)
    return { entradas, saidas }
  }, [lancamentos])

  const podeConfirmar = lancamentos.length > 0 && !isLoading

  // Conteúdo do drawer
  const content = (
    <div className={cn('flex flex-col h-full', isDesktop ? 'p-6' : 'p-4')}>
      {/* Header minimalista */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rosa via-rosa to-vermelho/80 flex items-center justify-center shadow-lg shadow-rosa/20">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <DrawerPrimitive.Title className="text-titulo-card text-foreground font-medium">
              Lançamento Inteligente
            </DrawerPrimitive.Title>
            <p className="text-micro text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Escreva naturalmente, a IA entende
            </p>
          </div>
        </div>
        <DrawerPrimitive.Close className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <X className="w-5 h-5" />
        </DrawerPrimitive.Close>
      </div>

      {/* Input principal - clean e moderno */}
      <div className="relative mb-4">
        <div className={cn(
          'flex items-center gap-3 rounded-2xl border-2 bg-card p-4',
          'transition-all duration-200',
          isListening
            ? 'border-rosa bg-rosa/5 shadow-lg shadow-rosa/10'
            : isParsing
              ? 'border-rosa/50'
              : 'border-border focus-within:border-rosa focus-within:shadow-lg focus-within:shadow-rosa/10'
        )}>
          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleProcess()
              }
            }}
            placeholder={isListening ? 'Ouvindo...' : 'Netflix 55,90, salário 5000...'}
            disabled={isParsing}
            className={cn(
              'flex-1 bg-transparent text-corpo text-foreground',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none',
            )}
          />

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
            {/* Microfone */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceRecognition}
                disabled={isParsing}
                className={cn(
                  'p-2.5 rounded-xl transition-all',
                  isListening
                    ? 'bg-rosa text-white animate-pulse'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            {/* Processar */}
            <button
              type="button"
              onClick={handleProcess}
              disabled={!texto.trim() || isParsing}
              className={cn(
                'p-2.5 rounded-xl transition-all',
                texto.trim() && !isParsing
                  ? 'bg-rosa text-white hover:bg-rosa/90 shadow-md shadow-rosa/20 active:scale-95'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isParsing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Hint de IA */}
        {lancamentos.length === 0 && !texto && !isParsing && (
          <p className="text-micro text-muted-foreground/60 mt-2 px-1">
            Dica: você pode escrever vários de uma vez separados por vírgula
          </p>
        )}
      </div>

      {/* Estado de processamento */}
      <AnimatePresence>
        {isParsing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="flex items-center gap-3 p-4 rounded-xl bg-rosa/5 border border-rosa/20">
              <div className="relative">
                <Sparkles className="w-5 h-5 text-rosa animate-pulse" />
              </div>
              <div>
                <p className="text-corpo font-medium text-foreground">Analisando...</p>
                <p className="text-micro text-muted-foreground">A IA está identificando seus lançamentos</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Erro */}
      <AnimatePresence>
        {erro && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-xl bg-vermelho/10 border border-vermelho/20 text-vermelho text-micro"
          >
            {erro}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de lançamentos */}
      <div className={cn('flex-1 overflow-y-auto -mx-4 px-4', isDesktop && '-mx-6 px-6')}>
        {lancamentos.length > 0 && (
          <>
            {/* Header da lista */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 text-micro">
                <span className="text-muted-foreground font-medium">
                  {lancamentos.length} {lancamentos.length === 1 ? 'item' : 'itens'}
                </span>
                {totais.entradas > 0 && (
                  <span className="text-verde">+{formatarValor(totais.entradas)}</span>
                )}
                {totais.saidas > 0 && (
                  <span className="text-vermelho">-{formatarValor(totais.saidas)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-micro text-muted-foreground hover:text-vermelho hover:bg-vermelho/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              <AnimatePresence mode="sync">
                {lancamentos.map((item) => (
                  <LancamentoItem
                    key={item.id}
                    item={item}
                    onToggleTipo={handleToggleTipo}
                    onUpdateLancamento={handleUpdateLancamento}
                    onUpdateRecorrencia={handleUpdateRecorrencia}
                    onUpdateCategoria={handleUpdateCategoria}
                    onRemoveLancamento={handleRemove}
                    mesesDisponiveis={mesesDisponiveis}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Footer com ações */}
      <div className={cn('flex gap-3 pt-4 mt-auto border-t border-border', !isDesktop && 'pb-safe')}>
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
            <>
              <Check className="w-4 h-4 mr-2" />
              Confirmar
            </>
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
            'fixed z-50 flex flex-col bg-card',
            isDesktop
              ? 'inset-y-0 right-0 h-full w-full max-w-md border-l border-border rounded-l-2xl shadow-xl'
              : 'inset-x-0 bottom-0 rounded-t-2xl border-t border-border shadow-xl'
          )}
          style={!isDesktop ? { maxHeight: '85vh' } : undefined}
        >
          {!isDesktop && (
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted" />
          )}
          {content}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}
