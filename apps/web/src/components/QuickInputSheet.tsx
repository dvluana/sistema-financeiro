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
  Trash2,
  CheckCircle2,
  Loader2,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  Calculator,
  DollarSign,
  Check,
  Hash,
  Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { type ParsedLancamento, parseInput } from '@/lib/parser'
import type { Categoria } from '@/lib/api'
import { categoriasApi } from '@/lib/api'

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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CategoriaSelect } from '@/components/CategoriaSelect'

interface QuickInputSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mesAtual: string
  onConfirm: (lancamentos: ParsedLancamento[]) => Promise<void>
}

// Componente para cada item de lançamento
const LancamentoItem = ({
  lancamento,
  index,
  mesAtual,
  categorias,
  onEdit,
  onRemove,
  onSetRecorrencia,
}: {
  lancamento: ParsedLancamento
  index: number
  mesAtual: string
  categorias: Categoria[]
  onEdit: (index: number, campo: keyof ParsedLancamento, valor: any) => void
  onRemove: (index: number) => void
  onSetRecorrencia: (index: number, rec: ParsedLancamento['recorrencia']) => void
}) => {
  const [expanded, setExpanded] = useState(false)
  const temRecorrencia = !!lancamento.recorrencia
  const isAgrupador = lancamento.isAgrupador || false
  const valorModo = lancamento.valorModo || 'soma'

  // Converte diaPrevisto para data completa
  const getDataPrevista = () => {
    if (!lancamento.diaPrevisto) return ''
    return `${mesAtual}-${String(lancamento.diaPrevisto).padStart(2, '0')}`
  }

  // Extrai dia de uma data completa
  const setDataPrevista = (dateStr: string) => {
    if (!dateStr) {
      onEdit(index, 'diaPrevisto', null)
      return
    }
    const dia = parseInt(dateStr.split('-')[2])
    onEdit(index, 'diaPrevisto', isNaN(dia) ? null : dia)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.15 }}
      className="rounded-xl border bg-card overflow-hidden"
    >
      {/* Linha principal - sempre visível */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Toggle tipo entrada/saída */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(index, 'tipo', lancamento.tipo === 'entrada' ? 'saida' : 'entrada')
          }}
          className={cn(
            "shrink-0 px-2 py-1 rounded-md text-xs font-medium transition-colors",
            lancamento.tipo === 'entrada'
              ? "bg-verde/10 text-verde hover:bg-verde/20"
              : "bg-rosa/10 text-rosa hover:bg-rosa/20"
          )}
        >
          {lancamento.tipo === 'entrada' ? '+' : '−'}
        </button>

        {/* Nome */}
        <span className="flex-1 font-medium text-sm truncate">
          {lancamento.nome}
        </span>

        {/* Indicadores */}
        {isAgrupador && (
          <span className="text-[10px] text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded">
            grupo
          </span>
        )}
        {temRecorrencia && (
          <span className="text-[10px] text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
            {lancamento.recorrencia?.tipo === 'mensal' ? '12x' : `${lancamento.recorrencia?.quantidade}x`}
          </span>
        )}
        {lancamento.concluido && (
          <span className="text-[10px] text-verde bg-verde/10 px-1.5 py-0.5 rounded">
            {lancamento.tipo === 'entrada' ? 'recebido' : 'pago'}
          </span>
        )}

        {/* Valor */}
        <span className={cn(
          "shrink-0 font-bold text-sm tabular-nums",
          lancamento.tipo === 'entrada' ? "text-verde" : "text-rosa"
        )}>
          {isAgrupador && valorModo === 'soma' ? (
            <span className="text-muted-foreground font-normal">soma</span>
          ) : (
            `R$ ${(lancamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          )}
        </span>

        {/* Botão remover */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(index)
          }}
          className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Área expandida para edição */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-3 border-t bg-muted/20">
              {/* Tipo - segmented control */}
              <div className="flex p-0.5 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => onEdit(index, 'tipo', 'entrada')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
                    lancamento.tipo === 'entrada'
                      ? "bg-background text-verde shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingUp className="w-3 h-3" />
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(index, 'tipo', 'saida')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
                    lancamento.tipo === 'saida'
                      ? "bg-background text-rosa shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingDown className="w-3 h-3" />
                  Saída
                </button>
              </div>

              {/* Nome */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Descrição</label>
                <Input
                  value={lancamento.nome}
                  onChange={(e) => onEdit(index, 'nome', e.target.value)}
                  className="h-8 text-sm"
                  placeholder={lancamento.tipo === 'entrada' ? "Ex: Salário, Freelance..." : "Ex: Mercado, Netflix..."}
                />
              </div>

              {/* Valor - só se não for agrupador com soma */}
              {(!isAgrupador || valorModo === 'fixo') && (
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Valor</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <Input
                      value={(lancamento.valor || 0).toFixed(2).replace('.', ',')}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value.replace(',', '.'))
                        if (!isNaN(num)) onEdit(index, 'valor', num)
                      }}
                      className={cn(
                        "h-8 text-sm font-bold pl-9",
                        lancamento.tipo === 'entrada' ? "text-verde" : "text-rosa"
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Categoria */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Categoria</label>
                <CategoriaSelect
                  value={lancamento.categoriaId || null}
                  onChange={(catId) => onEdit(index, 'categoriaId', catId)}
                  categorias={categorias}
                  compact
                />
              </div>

              {/* Datas - mesma linha */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">
                    {lancamento.tipo === 'entrada' ? 'Recebimento' : 'Pagamento'}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      value={getDataPrevista()}
                      onChange={(e) => setDataPrevista(e.target.value)}
                      className="h-8 text-xs pl-7"
                    />
                  </div>
                </div>
                {lancamento.tipo === 'saida' && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Vencimento</label>
                    <Input
                      type="date"
                      value={lancamento.dataVencimento || ''}
                      onChange={(e) => onEdit(index, 'dataVencimento', e.target.value || null)}
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Já paguei/recebi */}
              <div className="flex items-center justify-between py-1 border-t pt-2">
                <Label htmlFor={`concluido-${index}`} className="text-xs cursor-pointer">
                  {lancamento.tipo === 'entrada' ? 'Já recebi' : 'Já paguei'}
                </Label>
                <Switch
                  id={`concluido-${index}`}
                  checked={lancamento.concluido || false}
                  onCheckedChange={(checked) => onEdit(index, 'concluido', checked)}
                  className="scale-90 data-[state=checked]:bg-verde"
                />
              </div>

              {/* Criar como Grupo */}
              <div className="border-t pt-2">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-muted-foreground" />
                    <Label htmlFor={`grupo-${index}`} className="text-xs cursor-pointer">
                      Criar como grupo
                    </Label>
                  </div>
                  <Switch
                    id={`grupo-${index}`}
                    checked={isAgrupador}
                    onCheckedChange={(checked) => {
                      onEdit(index, 'isAgrupador', checked)
                      if (checked) {
                        onEdit(index, 'valorModo', 'soma')
                      }
                    }}
                    className="scale-90"
                  />
                </div>

                {/* Opções do grupo */}
                <AnimatePresence>
                  {isAgrupador && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 pt-2 border-t border-dashed space-y-2">
                        <p className="text-[10px] text-muted-foreground">
                          Como calcular o valor total?
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(index, 'valorModo', 'soma')}
                            className={cn(
                              "flex items-center gap-1.5 p-2 rounded border text-left text-[10px] transition-colors",
                              valorModo === 'soma'
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/50"
                            )}
                          >
                            <Calculator className="w-3 h-3 shrink-0" />
                            <div>
                              <p className="font-medium">Soma</p>
                              <p className="text-muted-foreground">Soma os itens</p>
                            </div>
                            {valorModo === 'soma' && (
                              <Check className="w-3 h-3 ml-auto text-primary" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(index, 'valorModo', 'fixo')}
                            className={cn(
                              "flex items-center gap-1.5 p-2 rounded border text-left text-[10px] transition-colors",
                              valorModo === 'fixo'
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/50"
                            )}
                          >
                            <DollarSign className="w-3 h-3 shrink-0" />
                            <div>
                              <p className="font-medium">Fixo</p>
                              <p className="text-muted-foreground">Valor definido</p>
                            </div>
                            {valorModo === 'fixo' && (
                              <Check className="w-3 h-3 ml-auto text-primary" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Repetir */}
              <div className="border-t pt-2">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5">
                    <Repeat className="w-3 h-3 text-muted-foreground" />
                    <Label htmlFor={`repetir-${index}`} className="text-xs cursor-pointer">
                      Repetir lançamento
                    </Label>
                  </div>
                  <Switch
                    id={`repetir-${index}`}
                    checked={temRecorrencia}
                    onCheckedChange={(checked) =>
                      onSetRecorrencia(index, checked ? { tipo: 'mensal', quantidade: 12 } : undefined)
                    }
                    className="scale-90"
                  />
                </div>

                {/* Opções de recorrência */}
                <AnimatePresence>
                  {temRecorrencia && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 pt-2 border-t border-dashed space-y-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSetRecorrencia(index, { tipo: 'mensal', quantidade: 12 })}
                            className={cn(
                              "p-2 rounded border text-[10px] font-medium transition-colors",
                              lancamento.recorrencia?.tipo === 'mensal'
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-muted-foreground/50"
                            )}
                          >
                            Mensal (12x)
                          </button>
                          <button
                            type="button"
                            onClick={() => onSetRecorrencia(index, { tipo: 'parcelas', quantidade: lancamento.recorrencia?.quantidade || 3 })}
                            className={cn(
                              "p-2 rounded border text-[10px] font-medium transition-colors",
                              lancamento.recorrencia?.tipo === 'parcelas'
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-muted-foreground/50"
                            )}
                          >
                            Parcelado
                          </button>
                        </div>

                        {lancamento.recorrencia?.tipo === 'parcelas' && (
                          <div className="flex items-center gap-2">
                            <Hash className="w-3 h-3 text-muted-foreground" />
                            <Input
                              type="number"
                              min="2"
                              max="60"
                              value={lancamento.recorrencia.quantidade}
                              onChange={(e) => {
                                const qtd = parseInt(e.target.value)
                                if (!isNaN(qtd) && qtd >= 2 && qtd <= 60) {
                                  onSetRecorrencia(index, { tipo: 'parcelas', quantidade: qtd })
                                }
                              }}
                              className="w-16 h-7 text-[10px] text-center"
                            />
                            <span className="text-[10px] text-muted-foreground">parcelas</span>
                          </div>
                        )}

                        <p className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
                          {isAgrupador ? (
                            lancamento.recorrencia?.tipo === 'mensal' ? (
                              <>Será criado <strong>1 grupo por mês</strong> nos próximos <strong>12 meses</strong></>
                            ) : (
                              <>Será criado <strong>1 grupo por mês</strong> em <strong>{lancamento.recorrencia?.quantidade || '0'} meses</strong></>
                            )
                          ) : (
                            lancamento.recorrencia?.tipo === 'mensal' ? (
                              <>Será criado para os próximos <strong>12 meses</strong></>
                            ) : (
                              <>Será criado em <strong>{lancamento.recorrencia?.quantidade || '0'} parcelas</strong></>
                            )
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Carrega categorias
  useEffect(() => {
    async function loadCategorias() {
      try {
        const data = await categoriasApi.listar()
        setCategorias(data)
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      }
    }
    if (open) {
      loadCategorias()
    }
  }, [open])

  // Suporte a reconhecimento de voz
  const speechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Ref para controlar se queremos parar intencionalmente
  const shouldStopRef = useRef(false)

  // Limpa estado ao fechar
  useEffect(() => {
    if (!open) {
      setInput('')
      setLancamentos([])
      setIsParsing(false)
      setIsSubmitting(false)
      setIsListening(false)
      shouldStopRef.current = true
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore
        }
      }
    }
  }, [open])

  // Ref para armazenar texto já finalizado (para não perder quando vem interim)
  const finalizedTextRef = useRef('')

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
      console.log('Speech result event:', event.results)

      let finalTranscript = ''
      let interimTranscript = ''

      // Processa todos os resultados
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      console.log('Final:', finalTranscript, 'Interim:', interimTranscript)

      // Atualiza o texto finalizado se tiver novo conteúdo final
      if (finalTranscript.trim()) {
        finalizedTextRef.current = finalTranscript.trim()
      }

      // Mostra o texto finalizado + interim (se houver)
      const displayText = finalizedTextRef.current + (interimTranscript ? ' ' + interimTranscript : '')
      setInput(displayText.trim())
    }

    recognition.onaudiostart = () => {
      console.log('Audio capturing started')
    }

    recognition.onspeechstart = () => {
      console.log('Speech detected')
    }

    recognition.onspeechend = () => {
      console.log('Speech ended')
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      // Erros fatais - para de ouvir
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        shouldStopRef.current = true
        setIsListening(false)
      }
      // no-speech não é fatal - só significa que não detectou fala ainda
    }

    recognition.onend = () => {
      console.log('Recognition ended, shouldStop:', shouldStopRef.current)
      // Se não foi parada intencional e ainda está "ouvindo", reinicia
      if (!shouldStopRef.current) {
        try {
          recognition.start()
          return // Não seta isListening para false
        } catch {
          // Falhou ao reiniciar
        }
      }
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      shouldStopRef.current = true
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore
        }
      }
    }
  }, [speechSupported])

  // Toggle reconhecimento de voz
  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      console.error('Speech recognition not available')
      return
    }

    if (isListening) {
      // Parada intencional
      shouldStopRef.current = true
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
      setIsListening(false)
    } else {
      try {
        // Reseta o texto finalizado para nova sessão
        finalizedTextRef.current = ''
        shouldStopRef.current = false
        // Inicia - SpeechRecognition gerencia sua própria permissão
        recognitionRef.current.start()
        console.log('Speech recognition started')
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

  // Define recorrência
  const handleSetRecorrencia = (index: number, rec: ParsedLancamento['recorrencia']) => {
    setLancamentos(prev => prev.map((l, i) =>
      i === index ? { ...l, recorrencia: rec } : l
    ))
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
              <div className="flex items-start gap-3 p-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Ctrl+Enter ou Cmd+Enter processa
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleProcess()
                    }
                  }}
                  placeholder={
                    isListening
                      ? "🎤 Ouvindo..."
                      : "Cole sua planilha ou digite:\nSalário 5000, Netflix 55,90..."
                  }
                  disabled={isParsing || isListening}
                  rows={3}
                  className={cn(
                    "flex-1 text-sm min-h-[60px] max-h-[120px] py-1 px-0 resize-none",
                    "bg-transparent border-0 rounded-none",
                    "placeholder:text-muted-foreground/60",
                    "focus:outline-none focus:ring-0",
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
                      mesAtual={mesAtual}
                      categorias={categorias}
                      onEdit={handleEdit}
                      onRemove={handleRemove}
                      onSetRecorrencia={handleSetRecorrencia}
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