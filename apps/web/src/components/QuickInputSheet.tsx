/**
 * QuickInputSheet Component
 * 
 * Sheet modernizado para entrada rápida de múltiplos lançamentos.
 * Design atualizado com melhor UX, animações fluidas e feedback visual aprimorado.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Sparkles,
  Repeat,
  Calendar,
  Trash2,
  CheckCircle2,
  Loader2,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { type ParsedLancamento, parseInput } from '@/lib/parser'

// Componentes shadcn/ui
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'

interface QuickInputSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mesAtual: string
  onConfirm: (lancamentos: ParsedLancamento[]) => Promise<void>
}

// Componente para cada item de lançamento - Design compacto e limpo
const LancamentoItem = ({
  lancamento,
  index,
  onEdit,
  onRemove,
  onToggleRecorrencia,
}: {
  lancamento: ParsedLancamento
  index: number
  onEdit: (index: number, campo: keyof ParsedLancamento, valor: any) => void
  onRemove: (index: number) => void
  onToggleRecorrencia: (index: number) => void
}) => {
  const [isEditingNome, setIsEditingNome] = useState(false)
  const [isEditingValor, setIsEditingValor] = useState(false)
  const [valorTemp, setValorTemp] = useState('')
  const temRecorrencia = !!lancamento.recorrencia

  const handleValueSave = () => {
    const numValue = parseFloat(valorTemp.replace(',', '.'))
    if (!isNaN(numValue) && numValue > 0) {
      onEdit(index, 'valor', numValue)
    }
    setIsEditingValor(false)
  }

  const startEditValor = () => {
    setValorTemp((lancamento.valor || 0).toFixed(2).replace('.', ','))
    setIsEditingValor(true)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl border bg-card",
        "transition-shadow hover:shadow-sm",
        lancamento.tipo === 'entrada' ? "border-verde/20" : "border-rosa/20"
      )}
    >
      {/* Barra indicadora de tipo */}
      <div className={cn(
        "shrink-0 w-1 h-12 rounded-full",
        lancamento.tipo === 'entrada' ? "bg-verde" : "bg-rosa"
      )} />

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0">
        {/* Nome - clicável para editar */}
        {isEditingNome ? (
          <Input
            value={lancamento.nome}
            onChange={(e) => onEdit(index, 'nome', e.target.value)}
            onBlur={() => setIsEditingNome(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingNome(false)}
            className="h-7 text-sm font-medium px-2"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingNome(true)}
            className="text-left w-full"
          >
            <p className="font-medium text-sm truncate hover:text-primary transition-colors">
              {lancamento.nome}
            </p>
          </button>
        )}

        {/* Tags: dia e recorrência */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {lancamento.diaPrevisto && (
            <span className="inline-flex items-center text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              <Calendar className="w-2.5 h-2.5 mr-0.5" />
              dia {lancamento.diaPrevisto}
            </span>
          )}
          <button
            onClick={() => onToggleRecorrencia(index)}
            className={cn(
              "inline-flex items-center text-[10px] px-1.5 py-0.5 rounded transition-colors",
              temRecorrencia
                ? "bg-blue-500/10 text-blue-600"
                : "bg-muted text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600"
            )}
          >
            <Repeat className="w-2.5 h-2.5 mr-0.5" />
            {temRecorrencia
              ? (lancamento.recorrencia?.tipo === 'mensal' ? '12x' : `${lancamento.recorrencia?.quantidade}x`)
              : 'repetir'
            }
          </button>
        </div>
      </div>

      {/* Valor - clicável para editar */}
      {isEditingValor ? (
        <Input
          value={valorTemp}
          onChange={(e) => setValorTemp(e.target.value.replace(/[^0-9,]/g, ''))}
          onBlur={handleValueSave}
          onKeyDown={(e) => e.key === 'Enter' && handleValueSave()}
          className={cn(
            "h-8 w-24 text-sm font-bold text-right px-2",
            lancamento.tipo === 'entrada' ? "text-verde" : "text-rosa"
          )}
          autoFocus
        />
      ) : (
        <button
          onClick={startEditValor}
          className={cn(
            "shrink-0 text-sm font-bold tabular-nums hover:opacity-70 transition-opacity",
            lancamento.tipo === 'entrada' ? "text-verde" : "text-rosa"
          )}
        >
          R$ {(lancamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </button>
      )}

      {/* Botão remover */}
      <button
        onClick={() => onRemove(index)}
        className={cn(
          "shrink-0 p-1.5 rounded-lg transition-all",
          "opacity-0 group-hover:opacity-100",
          "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

export function QuickInputSheet({
  open,
  onOpenChange,
  mesAtual,
  onConfirm,
}: QuickInputSheetProps) {
  const isDesktop = useIsDesktop()
  const [input, setInput] = useState('')
  const [lancamentos, setLancamentos] = useState<ParsedLancamento[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showTips, setShowTips] = useState(true)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Suporte a reconhecimento de voz
  const speechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Limpa estado ao fechar
  useEffect(() => {
    if (!open) {
      setInput('')
      setLancamentos([])
      setIsParsing(false)
      setIsSubmitting(false)
      setIsListening(false)
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [open])

  // Configura reconhecimento de voz (apenas uma vez)
  useEffect(() => {
    if (!speechSupported) return

    const SpeechRecognition = (window as any).SpeechRecognition ||
                              (window as any).webkitSpeechRecognition

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'pt-BR'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript = transcript
        }
      }

      // Mostra resultado intermediário enquanto fala, ou final quando termina frase
      if (finalTranscript) {
        setInput(prev => prev ? `${prev}, ${finalTranscript}` : finalTranscript)
      } else if (interimTranscript) {
        // Para interim, só mostra se não tiver texto final ainda
        setInput(interimTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore errors on cleanup
        }
      }
    }
  }, [speechSupported])

  // Toggle reconhecimento de voz
  const toggleVoiceRecognition = async () => {
    if (!recognitionRef.current) {
      console.error('Speech recognition not available')
      return
    }

    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore stop errors
      }
      setIsListening(false)
    } else {
      try {
        // Pede permissão do microfone primeiro
        await navigator.mediaDevices.getUserMedia({ audio: true })
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error('Microphone permission denied or error:', err)
        setIsListening(false)
      }
    }
  }

  // Processa o input
  const handleProcess = () => {
    if (!input.trim() || isParsing) return

    setIsParsing(true)

    const result = parseInput(input, mesAtual)
    const parsed = result.lancamentos

    setLancamentos(prev => [...prev, ...parsed])
    setInput('')
    setIsParsing(false)
    setShowTips(false)

    // Foca no input novamente
    inputRef.current?.focus()
  }

  // Edita um lançamento
  const handleEdit = (index: number, campo: keyof ParsedLancamento, valor: any) => {
    setLancamentos(prev => prev.map((l, i) => 
      i === index ? { ...l, [campo]: valor } : l
    ))
  }

  // Remove um lançamento
  const handleRemove = (index: number) => {
    setLancamentos(prev => prev.filter((_, i) => i !== index))
  }

  // Toggle recorrência
  const handleToggleRecorrencia = (index: number) => {
    setLancamentos(prev => prev.map((l, i) => {
      if (i !== index) return l

      if (l.recorrencia) {
        return { ...l, recorrencia: undefined }
      } else {
        return { ...l, recorrencia: { tipo: 'mensal' as const, quantidade: 12 } }
      }
    }))
  }

  // Confirma e salva
  const handleConfirm = async () => {
    if (lancamentos.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    await onConfirm(lancamentos)
    setIsSubmitting(false)
    onOpenChange(false)
  }

  // Calcula totais
  const totais = lancamentos.reduce(
    (acc, l) => {
      const valorNum = l.valor ?? 0
      const valor = l.tipo === 'entrada' ? valorNum : -valorNum
      return {
        ...acc,
        total: acc.total + valor,
        entradas: l.tipo === 'entrada' ? acc.entradas + valorNum : acc.entradas,
        saidas: l.tipo === 'saida' ? acc.saidas + valorNum : acc.saidas,
        quantidade: acc.quantidade + 1,
      }
    },
    { total: 0, entradas: 0, saidas: 0, quantidade: 0 }
  )

  // Exemplos de entrada
  const exemplos = [
    "Salário 5000, Netflix 55,90",
    "Mercado 350 dia 15, Aluguel 1200 dia 5",
    "Uber 45,50, iFood 89,90, Spotify 19,90",
  ]

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={cn(
            "p-0 flex flex-col",
            isDesktop
              ? "w-full sm:max-w-lg h-full"
              : "h-[85vh] rounded-t-3xl"
          )}
        >
          {/* Header com gradiente */}
          <div className="relative overflow-hidden border-b">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10" />
            <SheetHeader className="relative px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-semibold">
                    Entrada Rápida
                  </SheetTitle>
                  <SheetDescription className="text-sm">
                    Adicione vários lançamentos de uma vez
                  </SheetDescription>
                </div>
              </div>
              
              {/* Barra de progresso visual */}
              {lancamentos.length > 0 && (
                <div className="mt-3">
                  <Progress 
                    value={(lancamentos.length / 10) * 100} 
                    className="h-1.5"
                    indicatorClassName="bg-gradient-to-r from-amber-500 to-orange-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {lancamentos.length} {lancamentos.length === 1 ? 'item' : 'itens'} adicionado{lancamentos.length === 1 ? '' : 's'}
                  </p>
                </div>
              )}
            </SheetHeader>
          </div>

          {/* Input area com design melhorado */}
          <div className="px-6 py-4 border-b bg-muted/30">
            <div className={cn(
              "relative rounded-xl border-2 transition-all duration-200",
              "bg-background",
              isListening 
                ? "border-amber-500 shadow-lg shadow-amber-500/20" 
                : isParsing
                ? "border-blue-500 shadow-lg shadow-blue-500/20"
                : "border-border hover:border-primary/50 focus-within:border-primary"
            )}>
              <div className="flex items-center gap-3 p-3">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleProcess()
                    }
                  }}
                  placeholder={
                    isListening
                      ? "🎤 Ouvindo..."
                      : "Digite: Salário 5000, Netflix 55,90..."
                  }
                  disabled={isParsing || isListening}
                  className={cn(
                    "flex-1 text-sm h-auto min-h-0 py-0 px-0",
                    "bg-transparent !border-0 rounded-none",
                    "placeholder:text-muted-foreground/60",
                    "focus:!border-0 focus:outline-none focus:ring-0",
                    "focus-visible:ring-0 focus-visible:ring-offset-0"
                  )}
                  autoFocus
                />

                {/* Botões de ação */}
                <div className="flex items-center gap-1">
                  {/* Microfone */}
                  {speechSupported && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={isListening ? "default" : "ghost"}
                          onClick={toggleVoiceRecognition}
                          disabled={isParsing}
                          className={cn(
                            "h-9 w-9",
                            isListening && "bg-amber-500 hover:bg-amber-600 animate-pulse"
                          )}
                        >
                          {isListening ? (
                            <MicOff className="w-4 h-4" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isListening ? 'Parar gravação' : 'Usar microfone'}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Processar */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        onClick={handleProcess}
                        disabled={!input.trim() || isParsing}
                        className={cn(
                          "h-9 w-9",
                          input.trim() && !isParsing 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                            : ""
                        )}
                      >
                        {isParsing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Processar entrada</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Dicas e exemplos */}
            <AnimatePresence>
              {showTips && lancamentos.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 space-y-3"
                >
                  <p className="text-xs text-muted-foreground font-medium">
                    💡 Exemplos de entrada:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {exemplos.map((exemplo, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(exemplo)}
                        className={cn(
                          "text-xs px-2.5 py-1.5 rounded-lg",
                          "bg-secondary/80 hover:bg-secondary",
                          "text-muted-foreground hover:text-foreground",
                          "border border-transparent hover:border-border",
                          "transition-all duration-150"
                        )}
                      >
                        {exemplo}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Lista de lançamentos */}
          <ScrollArea className="flex-1 px-6 py-4">
            {lancamentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 mb-4">
                  <Sparkles className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-medium mb-1">
                  Comece a adicionar lançamentos
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Digite múltiplos lançamentos separados por vírgula ou use o microfone para ditar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {lancamentos.map((lancamento, index) => (
                    <LancamentoItem
                      key={`${lancamento.nome}-${index}`}
                      lancamento={lancamento}
                      index={index}
                      onEdit={handleEdit}
                      onRemove={handleRemove}
                      onToggleRecorrencia={handleToggleRecorrencia}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>

          {/* Footer com totais e ações */}
          {lancamentos.length > 0 && (
            <div className="border-t bg-muted/30">
              {/* Resumo de valores */}
              <div className="px-6 py-3 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Entradas</p>
                  <p className="text-sm font-bold text-verde">
                    R$ {totais.entradas.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Saídas</p>
                  <p className="text-sm font-bold text-rosa">
                    R$ {totais.saidas.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={cn(
                    "text-sm font-bold",
                    totais.total >= 0 ? "text-verde" : "text-vermelho"
                  )}>
                    R$ {Math.abs(totais.total).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>

              {/* Botões de ação */}
              <SheetFooter className="px-6 py-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isSubmitting || lancamentos.length === 0}
                  className={cn(
                    "flex-1 sm:flex-initial",
                    "bg-gradient-to-r from-amber-500 to-orange-500",
                    "hover:from-amber-600 hover:to-orange-600",
                    "text-white shadow-md"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar {lancamentos.length} {lancamentos.length === 1 ? 'item' : 'itens'}
                    </>
                  )}
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}