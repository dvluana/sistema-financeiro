/**
 * QuickInputSheet Component
 *
 * Drawer/Bottomsheet responsivo para lançamento rápido por texto.
 * - Desktop/tablets grandes: Drawer lateral direito
 * - Mobile/tablets pequenos: Bottomsheet
 *
 * Permite ao usuário digitar lançamentos de forma natural e confirmar antes de salvar.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
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
  Sparkles,
  Mic,
  MicOff,
  Trash2,
  Repeat,
} from 'lucide-react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { aiApi } from '@/lib/api'
import {
  formatarValor,
  formatarMesExibicao,
  agruparRecorrencias,
  gerarListaMeses,
  extrairMesGlobal,
  type ParsedLancamento,
} from '@/lib/parser'

// Chave do localStorage para histórico
const HISTORICO_KEY = 'quick-input-historico'
const MAX_HISTORICO = 5

// Props do card de lançamento
interface LancamentoCardProps {
  items: ParsedLancamento[]
  groupKey: string
  isExpanded: boolean
  onToggleGroup: (key: string) => void
  onToggleTipo: (id: string) => void
  onUpdateLancamento: (id: string, campo: 'valor' | 'nome' | 'mes', valor: string) => void
  onUpdateRecorrencia: (id: string, recorrencia: ParsedLancamento['recorrencia']) => void
  onRemoveLancamento: (id: string) => void
  mesesDisponiveis: Array<{ value: string; label: string }>
}

// Componente do card de lançamento - ultra minimalista com edição inline
const LancamentoCard = React.memo(function LancamentoCard({
  items,
  groupKey,
  isExpanded,
  onToggleGroup,
  onToggleTipo,
  onUpdateLancamento,
  onUpdateRecorrencia,
  onRemoveLancamento,
  mesesDisponiveis,
}: LancamentoCardProps) {
  const isRecorrencia = items.length > 1
  const primeiro = items[0]
  const isEntrada = primeiro.tipo === 'entrada'
  const temErro = primeiro.status === 'incompleto'
  const temRecorrencia = !!primeiro.recorrencia

  // Estado local para edição de parcelas
  const [showRecorrenciaOptions, setShowRecorrenciaOptions] = useState(false)
  const [parcelasInput, setParcelasInput] = useState(
    primeiro.recorrencia?.tipo === 'parcelas' ? String(primeiro.recorrencia.quantidade) : '12'
  )

  // Formata valor para exibição no input
  const valorFormatado = primeiro.valor !== null
    ? primeiro.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    : ''

  // Função para alternar recorrência
  const handleToggleRecorrencia = () => {
    if (temRecorrencia) {
      // Remove recorrência
      items.forEach((item) => onUpdateRecorrencia(item.id, undefined))
      setShowRecorrenciaOptions(false)
    } else {
      // Ativa recorrência mensal por padrão
      items.forEach((item) => onUpdateRecorrencia(item.id, { tipo: 'mensal', quantidade: 12 }))
      setShowRecorrenciaOptions(true)
    }
  }

  // Função para mudar tipo de recorrência
  const handleTipoRecorrencia = (tipo: 'mensal' | 'parcelas') => {
    const quantidade = tipo === 'mensal' ? 12 : parseInt(parcelasInput) || 12
    items.forEach((item) => onUpdateRecorrencia(item.id, { tipo, quantidade }))
  }

  // Função para atualizar quantidade de parcelas
  const handleParcelasChange = (value: string) => {
    setParcelasInput(value)
    const num = parseInt(value)
    if (num >= 2 && num <= 60) {
      items.forEach((item) => onUpdateRecorrencia(item.id, { tipo: 'parcelas', quantidade: num }))
    }
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.15 }}
      className="group mb-1.5"
    >
      <div className={cn(
        'flex items-center gap-2 py-2 px-2 rounded-xl transition-colors',
        'hover:bg-secondary/50',
        temErro && 'bg-vermelho/5'
      )}>
        {/* Toggle tipo - pill minimalista */}
        <button
          type="button"
          onClick={() => items.forEach((item) => onToggleTipo(item.id))}
          className={cn(
            'shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
            'transition-all hover:scale-110 active:scale-95',
            isEntrada
              ? 'bg-verde/15 text-verde'
              : 'bg-vermelho/15 text-vermelho'
          )}
          title={isEntrada ? 'Entrada - clique para mudar' : 'Saída - clique para mudar'}
        >
          {isEntrada ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Nome - sempre editável */}
        <input
          type="text"
          value={primeiro.nome}
          onChange={(e) =>
            items.forEach((item) =>
              onUpdateLancamento(item.id, 'nome', e.target.value)
            )
          }
          placeholder="Descrição"
          className={cn(
            'flex-1 min-w-0 bg-transparent text-corpo text-foreground',
            'focus:outline-none placeholder:text-muted-foreground/40',
            'border-b border-transparent focus:border-muted-foreground/30',
            'transition-colors py-0.5',
            temErro && !primeiro.nome && 'border-vermelho/30 placeholder:text-vermelho/50'
          )}
        />

        {/* Toggle recorrência - discreto */}
        <button
          type="button"
          onClick={handleToggleRecorrencia}
          className={cn(
            'shrink-0 p-1.5 rounded-md transition-all',
            temRecorrencia
              ? 'bg-rosa/15 text-rosa'
              : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent'
          )}
          title={temRecorrencia ? 'Lançamento único' : 'Repetir nos próximos meses'}
        >
          <Repeat className="w-3.5 h-3.5" />
        </button>

        {/* Mês - select discreto */}
        {isRecorrencia ? (
          <button
            type="button"
            onClick={() => onToggleGroup(groupKey)}
            className={cn(
              'shrink-0 text-micro text-muted-foreground px-2 py-1 rounded-md',
              'hover:bg-accent transition-colors inline-flex items-center gap-1'
            )}
          >
            <span>{items.length}x</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        ) : (
          <select
            value={primeiro.mes}
            onChange={(e) =>
              items.forEach((item) =>
                onUpdateLancamento(item.id, 'mes', e.target.value)
              )
            }
            className={cn(
              'shrink-0 bg-transparent text-micro text-muted-foreground',
              'border-none cursor-pointer focus:outline-none',
              'hover:text-foreground transition-colors',
              'appearance-none text-center w-16'
            )}
          >
            {mesesDisponiveis.map((mes) => (
              <option key={mes.value} value={mes.value}>
                {formatarMesExibicao(mes.value)}
              </option>
            ))}
          </select>
        )}

        {/* Valor - sempre editável, com prefixo +/- */}
        <div className={cn(
          'shrink-0 flex items-center gap-0.5',
          isEntrada ? 'text-verde' : 'text-vermelho'
        )}>
          <span className="text-corpo font-medium opacity-60">
            {isEntrada ? '+' : '-'}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={valorFormatado}
            onChange={(e) => {
              // Remove tudo exceto números e vírgula/ponto
              const raw = e.target.value.replace(/[^\d.,]/g, '')
              items.forEach((item) =>
                onUpdateLancamento(item.id, 'valor', raw)
              )
            }}
            placeholder="0,00"
            className={cn(
              'w-20 text-right bg-transparent text-corpo font-semibold tabular-nums',
              'focus:outline-none placeholder:text-current placeholder:opacity-30',
              'border-b border-transparent focus:border-current/30',
              'transition-colors py-0.5',
              isEntrada ? 'text-verde' : 'text-vermelho',
              temErro && !primeiro.valor && 'border-current/30'
            )}
          />
        </div>

        {/* Remover - sempre visível mas discreto */}
        <button
          type="button"
          onClick={() => items.forEach((item) => onRemoveLancamento(item.id))}
          className={cn(
            'shrink-0 p-1 rounded-md transition-all',
            'text-muted-foreground/30 hover:text-vermelho hover:bg-vermelho/10',
            'group-hover:text-muted-foreground/50'
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Opções de recorrência */}
      <AnimatePresence>
        {temRecorrencia && showRecorrenciaOptions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pl-10 pr-2 pb-2 pt-1">
              <p className="text-micro text-muted-foreground">
                Repetir este lançamento:
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTipoRecorrencia('mensal')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-micro transition-colors',
                    primeiro.recorrencia?.tipo === 'mensal'
                      ? 'bg-rosa/15 text-rosa font-medium'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  Todo mês
                </button>
                <button
                  type="button"
                  onClick={() => handleTipoRecorrencia('parcelas')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-micro transition-colors',
                    primeiro.recorrencia?.tipo === 'parcelas'
                      ? 'bg-rosa/15 text-rosa font-medium'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  Por tempo limitado
                </button>
                {primeiro.recorrencia?.tipo === 'parcelas' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={2}
                      max={60}
                      value={parcelasInput}
                      onChange={(e) => handleParcelasChange(e.target.value)}
                      className={cn(
                        'w-12 text-center bg-secondary rounded-md py-1 text-micro',
                        'border-none focus:outline-none focus:ring-1 focus:ring-rosa'
                      )}
                    />
                    <span className="text-micro text-muted-foreground">meses</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowRecorrenciaOptions(false)}
                  className="ml-auto text-muted-foreground/50 hover:text-muted-foreground"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador de recorrência quando colapsado */}
      {temRecorrencia && !showRecorrenciaOptions && (
        <button
          type="button"
          onClick={() => setShowRecorrenciaOptions(true)}
          className="flex items-center gap-1 pl-10 pr-2 pb-1 text-micro text-rosa/70 hover:text-rosa transition-colors"
        >
          <Repeat className="w-3 h-3" />
          <span>
            {primeiro.recorrencia?.tipo === 'mensal'
              ? 'Repete todo mês'
              : `Repete por ${primeiro.recorrencia?.quantidade} meses`
            }
          </span>
        </button>
      )}

      {/* Meses expandidos */}
      <AnimatePresence>
        {isRecorrencia && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1 pl-10 pr-2 pb-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group/item inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/70 text-micro"
                >
                  <select
                    value={item.mes}
                    onChange={(e) => onUpdateLancamento(item.id, 'mes', e.target.value)}
                    className="bg-transparent border-none text-foreground text-micro cursor-pointer focus:outline-none"
                  >
                    {mesesDisponiveis.map((mes) => (
                      <option key={mes.value} value={mes.value}>
                        {formatarMesExibicao(mes.value)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveLancamento(item.id)}
                    className="text-muted-foreground/40 hover:text-vermelho transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
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

  // Histórico de inputs
  const [historico, setHistorico] = useState<string[]>([])

  // Grupos expandidos (para recorrências)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Ref para o textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Verifica se o navegador suporta Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(!!SpeechRecognition)
  }, [])

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
      // Para o reconhecimento de voz se estiver ativo
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        setIsListening(false)
      }
    }
  }, [open])

  /**
   * Inicia/para o reconhecimento de voz
   */
  const toggleVoiceRecognition = useCallback(() => {
    if (!speechSupported) {
      setErro('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.')
      return
    }

    if (isListening) {
      // Para o reconhecimento
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    // Inicia o reconhecimento
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
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // Adiciona o texto reconhecido ao campo
      if (finalTranscript) {
        setTexto(prev => {
          const newText = prev ? `${prev} ${finalTranscript}` : finalTranscript
          return newText.trim()
        })
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false)

      switch (event.error) {
        case 'not-allowed':
          setErro('Permissão de microfone negada. Habilite nas configurações do navegador.')
          break
        case 'no-speech':
          // Silencioso - apenas para quando não detecta fala
          break
        case 'audio-capture':
          setErro('Nenhum microfone encontrado. Verifique se o microfone está conectado.')
          break
        case 'network':
          setErro('Erro de conexão com o serviço de voz. Verifique sua internet e tente novamente.')
          break
        case 'aborted':
          // Usuário cancelou - não mostra erro
          break
        case 'service-not-allowed':
          setErro('Serviço de reconhecimento não disponível. Tente usar Chrome ou Edge.')
          break
        default:
          setErro(`Erro no reconhecimento de voz: ${event.error}. Tente novamente.`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (error) {
      setIsListening(false)
      setErro('Não foi possível iniciar o reconhecimento de voz. Verifique as permissões do navegador.')
    }
  }, [speechSupported, isListening])

  // Limite máximo de lançamentos na lista
  const MAX_LANCAMENTOS = 50

  /**
   * Processa o texto digitado usando IA
   */
  const handleSubmitTexto = useCallback(async () => {
    if (!texto.trim()) return

    // Verifica se já atingiu o limite
    if (lancamentos.length >= MAX_LANCAMENTOS) {
      setErro(`Limite de ${MAX_LANCAMENTOS} lançamentos atingido. Confirme os atuais primeiro.`)
      return
    }

    setIsParsing(true)
    setErro(null)

    try {
      // Extrai mês global do texto (ex: "julho 2025", "tudo de janeiro")
      const mesGlobal = extrairMesGlobal(texto)
      const mesParaUsar = mesGlobal?.mes || mesAtual

      const result = await aiApi.parseLancamentos(texto, mesParaUsar)

      if (result.erro) {
        setErro(result.erro)
        return
      }

      if (result.lancamentos.length === 0) {
        setErro('Não consegui identificar lançamentos no texto. Tente ser mais específico.')
        return
      }

      // Calcula quantos lançamentos ainda cabem
      const espacoDisponivel = MAX_LANCAMENTOS - lancamentos.length
      const lancamentosParaAdicionar = result.lancamentos.slice(0, espacoDisponivel)

      if (result.lancamentos.length > espacoDisponivel) {
        setErro(`Apenas ${espacoDisponivel} dos ${result.lancamentos.length} lançamentos foram adicionados (limite: ${MAX_LANCAMENTOS})`)
      }

      // Converte resposta da IA para formato ParsedLancamento
      const timestamp = Date.now()
      const novosLancamentos: ParsedLancamento[] = lancamentosParaAdicionar.map((l, index) => {
        const id = `ia-${timestamp}-${index}`

        return {
          id,
          tipo: l.tipo,
          nome: l.nome,
          valor: l.valor,
          mes: mesParaUsar, // Usa o mês extraído do texto ou o mês atual
          diaPrevisto: l.diaPrevisto,
          status: 'completo' as const,
          camposFaltantes: [],
          groupId: id,
        }
      })

      // ADICIONA aos existentes ao invés de substituir
      setLancamentos(prev => [...prev, ...novosLancamentos])

      // Limpa o texto após adicionar com sucesso
      setTexto('')
    } catch {
      setErro('Erro ao processar com IA. Tente novamente.')
    } finally {
      setIsParsing(false)
    }
  }, [texto, mesAtual, lancamentos.length])

  /**
   * Atualiza campo de um lançamento
   */
  const handleUpdateLancamento = useCallback(
    (id: string, campo: 'valor' | 'nome' | 'mes', valor: string) => {
      setLancamentos((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l

          const updated = { ...l }
          if (campo === 'valor') {
            const valorNumerico = parseFloat(valor.replace(/[^\d.,]/g, '').replace(',', '.'))
            updated.valor = isNaN(valorNumerico) ? null : valorNumerico
          } else if (campo === 'mes') {
            updated.mes = valor
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
   * Atualiza recorrência de um lançamento
   */
  const handleUpdateRecorrencia = useCallback(
    (id: string, recorrencia: ParsedLancamento['recorrencia']) => {
      setLancamentos((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l
          return { ...l, recorrencia }
        })
      )
    },
    []
  )

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

  /**
   * Limpa todos os lançamentos
   */
  const handleClearAll = useCallback(() => {
    setLancamentos([])
    setExpandedGroups(new Set())
    setErro(null)
  }, [])

  // Agrupa lançamentos para exibição (memoizado para evitar re-renders)
  const grupos = useMemo(() => agruparRecorrencias(lancamentos), [lancamentos])

  // Lista de meses disponíveis para seleção (memoizado)
  const mesesDisponiveis = useMemo(() => gerarListaMeses(), [])

  // Conta total de lançamentos
  const totalLancamentos = lancamentos.length

  // Calcula totais de entradas e saídas
  const totais = useMemo(() => {
    const entradas = lancamentos
      .filter(l => l.tipo === 'entrada' && l.valor)
      .reduce((sum, l) => sum + (l.valor || 0), 0)
    const saidas = lancamentos
      .filter(l => l.tipo === 'saida' && l.valor)
      .reduce((sum, l) => sum + (l.valor || 0), 0)
    return { entradas, saidas, saldo: entradas - saidas }
  }, [lancamentos])

  // Verifica se pode confirmar
  const temIncompletos = lancamentos.some((l) => l.status === 'incompleto')
  const podeConfirmar = lancamentos.length > 0 && !temIncompletos && !isLoading

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
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <DrawerPrimitive.Title className="text-titulo-card text-foreground">
            Lançamento Rápido
          </DrawerPrimitive.Title>
          <p className="text-micro text-muted-foreground">
            Digite de forma natural, ex: "salário 5000 dia 5"
          </p>
        </div>
        <DrawerPrimitive.Close className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
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
          placeholder={isListening ? 'Ouvindo... fale agora' : 'Ex: Salário 5000 dia 5\nLuz 150, água 80\nNetflix 55.90'}
          className={cn(
            'w-full resize-none rounded-xl border-2 bg-secondary p-4 pr-28',
            'text-corpo text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-rosa/20 focus:border-rosa focus:bg-card',
            'transition-all',
            isDesktop ? 'min-h-[100px]' : 'min-h-[80px]',
            'max-h-[160px]',
            isListening ? 'border-rosa bg-rosa/5' : 'border-border'
          )}
          rows={3}
        />

        {/* Botões de ação */}
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          {/* Botão de microfone */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              disabled={isParsing}
              className={cn(
                'p-2.5 rounded-xl transition-all',
                isListening
                  ? 'bg-rosa text-white animate-pulse shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={isListening ? 'Parar de ouvir' : 'Falar'}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Botão de enviar */}
          <button
            type="button"
            onClick={handleSubmitTexto}
            disabled={!texto.trim() || isParsing}
            className={cn(
              'p-2.5 rounded-xl transition-all',
              texto.trim() && !isParsing
                ? 'bg-rosa text-white hover:bg-rosa/90 shadow-sm hover:shadow active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
            title="Processar com IA"
          >
            {isParsing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Sugestões do histórico */}
      {historico.length > 0 && lancamentos.length === 0 && !texto && (
        <div className="mb-4">
          <p className="text-micro text-muted-foreground mb-2">Recentes:</p>
          <div className="flex flex-wrap gap-2">
            {historico.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleUseSugestao(h)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-micro font-medium',
                  'bg-secondary text-muted-foreground hover:bg-accent',
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

      {/* Dica de IA */}
      {lancamentos.length === 0 && !texto && !isParsing && (
        <div className="mb-4 p-3 rounded-xl bg-secondary border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-rosa" />
            <p className="text-micro text-muted-foreground">Powered by AI - escreva naturalmente</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-verde/10 text-verde text-micro">
              <TrendingUp className="w-3 h-3" />
              salário, freelance, venda...
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-vermelho/10 text-vermelho text-micro">
              <TrendingDown className="w-3 h-3" />
              conta, parcela, aluguel...
            </span>
          </div>
        </div>
      )}

      {/* Loading da IA */}
      {isParsing && (
        <div className="mb-4 p-4 rounded-xl bg-rosa/5 border border-rosa/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="w-5 h-5 text-rosa animate-pulse" />
            </div>
            <div>
              <p className="text-corpo font-medium text-foreground">Processando com IA...</p>
              <p className="text-micro text-muted-foreground">Identificando lançamentos</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de lançamentos */}
      <div className={cn(
        'flex-1 overflow-y-auto -mx-4 px-4',
        isDesktop && '-mx-6 px-6'
      )}>
        {/* Header da lista com ações rápidas */}
        {lancamentos.length > 0 && (
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
            {/* Resumo compacto */}
            <div className="flex items-center gap-3 text-micro">
              <span className="text-muted-foreground">{totalLancamentos} {totalLancamentos === 1 ? 'item' : 'itens'}</span>
              {totais.entradas > 0 && (
                <span className="text-verde font-medium">
                  +{formatarValor(totais.entradas)}
                </span>
              )}
              {totais.saidas > 0 && (
                <span className="text-vermelho font-medium">
                  -{formatarValor(totais.saidas)}
                </span>
              )}
            </div>

            {/* Ações rápidas */}
            <button
              type="button"
              onClick={handleClearAll}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-micro',
                'text-muted-foreground hover:text-vermelho hover:bg-vermelho/10',
                'transition-colors'
              )}
              title="Limpar todos"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>
        )}

        {/* Cards dos lançamentos */}
        <AnimatePresence mode="sync">
          {Array.from(grupos.entries()).map(([key, items]) => (
            <LancamentoCard
              key={key}
              items={items}
              groupKey={key}
              isExpanded={expandedGroups.has(key)}
              onToggleGroup={toggleGroup}
              onToggleTipo={handleToggleTipo}
              onUpdateLancamento={handleUpdateLancamento}
              onUpdateRecorrencia={handleUpdateRecorrencia}
              onRemoveLancamento={handleRemoveLancamento}
              mesesDisponiveis={mesesDisponiveis}
            />
          ))}
        </AnimatePresence>

        {/* Mensagem de erro */}
        {erro && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center gap-2 p-3 rounded-xl mb-3',
              'bg-vermelho/5 border border-vermelho/20 text-vermelho text-micro'
            )}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </motion.div>
        )}
      </div>

      {/* Botões de ação */}
      <div className={cn(
        'flex gap-3 pt-4 mt-auto border-t border-border',
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
            'fixed z-50 flex flex-col bg-card',
            isDesktop
              ? // Drawer lateral (desktop/tablets grandes)
                'inset-y-0 right-0 h-full w-full max-w-lg border-l border-border rounded-l-2xl shadow-xl'
              : // Bottomsheet (mobile/tablets pequenos)
                'inset-x-0 bottom-0 rounded-t-2xl border-t border-border shadow-xl'
          )}
          style={!isDesktop ? { maxHeight: '90vh' } : undefined}
        >
          {/* Handle de arraste apenas no mobile */}
          {!isDesktop && (
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted" />
          )}

          {sharedContent}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}
