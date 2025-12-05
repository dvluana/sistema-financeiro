/**
 * HeroCard Component
 *
 * Card principal da dashboard com saudação contextual,
 * valores de entradas/saídas e resumo do saldo.
 */

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatarMoeda, cn } from '@/lib/utils'

interface HeroCardProps {
  nome: string
  mesSelecionado: string
  saldo: number
  jaEntrou: number
  jaPaguei: number
  pendentesEntrada: number
  pendentesSaida: number
  onMesAnterior: () => void
  onMesProximo: () => void
  podeAvancar: boolean
  isLoading?: boolean
}

/**
 * Retorna saudação baseada no horário
 */
function getSaudacao(): { texto: string; emoji: string } {
  const hora = new Date().getHours()

  if (hora >= 5 && hora < 12) {
    return { texto: 'Bom dia', emoji: '☕' }
  } else if (hora >= 12 && hora < 18) {
    return { texto: 'Boa tarde', emoji: '☀️' }
  } else {
    return { texto: 'Boa noite', emoji: '🌙' }
  }
}

/**
 * Formata mês YYYY-MM para exibição "Dez 2025"
 */
function formatarMes(mes: string): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const [ano, mesNum] = mes.split('-')
  return `${meses[parseInt(mesNum) - 1]} ${ano}`
}

export function HeroCard({
  nome,
  mesSelecionado,
  saldo,
  jaEntrou,
  jaPaguei,
  pendentesEntrada,
  pendentesSaida,
  onMesAnterior,
  onMesProximo,
  podeAvancar,
  isLoading = false,
}: HeroCardProps) {
  const saudacao = getSaudacao()
  const [hasInteracted, setHasInteracted] = useState(false)

  // Texto de pendentes para entradas
  const getPendentesEntradaTexto = () => {
    if (pendentesEntrada === 0) {
      return jaEntrou > 0 ? '· tudo recebido' : null
    }
    return `· ${pendentesEntrada} pendente${pendentesEntrada > 1 ? 's' : ''}`
  }

  // Texto de pendentes para saídas
  const getPendentesSaidaTexto = () => {
    if (pendentesSaida === 0) {
      return jaPaguei > 0 ? '· tudo pago' : null
    }
    return `· ${pendentesSaida} pendente${pendentesSaida > 1 ? 's' : ''}`
  }

  const pendentesEntradaTexto = getPendentesEntradaTexto()
  const pendentesSaidaTexto = getPendentesSaidaTexto()

  return (
    <div className="space-y-3">
      {/* Header: Saudação à esquerda, Navegação de mês à direita */}
      <div className="flex items-center justify-between px-1">
        {/* Saudação */}
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            {saudacao.texto}
          </p>
          <p className="text-[20px] font-semibold text-foreground leading-tight">
            {nome} {saudacao.emoji}
          </p>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setHasInteracted(true)
              onMesAnterior()
            }}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-md transition-all',
              'bg-card border border-border hover:bg-accent active:scale-95 text-muted-foreground'
            )}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[70px] text-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mesSelecionado}
                initial={hasInteracted ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.1 }}
                className="block text-pequeno font-medium text-foreground"
              >
                {formatarMes(mesSelecionado)}
              </motion.span>
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => {
              setHasInteracted(true)
              onMesProximo()
            }}
            disabled={!podeAvancar}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-md transition-all',
              'bg-card border border-border active:scale-95',
              podeAvancar ? 'text-muted-foreground hover:bg-accent' : 'text-muted-foreground/50 cursor-not-allowed opacity-50'
            )}
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards de valores - mesmo estilo dos vencimentos */}
      <div className="grid grid-cols-3 gap-2">
        {isLoading ? (
          // Skeleton loading
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-3">
                <div className="h-5 w-12 bg-muted rounded animate-pulse mb-2" />
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Card Entrou */}
            <div className="bg-card border border-border rounded-xl p-3">
              <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-verde/10 text-verde mb-2">
                Entrou
              </span>
              <p className="text-[17px] font-semibold text-foreground leading-none">
                {formatarMoeda(jaEntrou)}
              </p>
              {pendentesEntradaTexto && (
                <p className="text-[10px] text-verde mt-1.5">
                  {pendentesEntradaTexto}
                </p>
              )}
            </div>

            {/* Card Saiu */}
            <div className="bg-card border border-border rounded-xl p-3">
              <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-vermelho/10 text-vermelho mb-2">
                Saiu
              </span>
              <p className="text-[17px] font-semibold text-foreground leading-none">
                {formatarMoeda(jaPaguei)}
              </p>
              {pendentesSaidaTexto && (
                <p className="text-[10px] text-vermelho mt-1.5">
                  {pendentesSaidaTexto}
                </p>
              )}
            </div>

            {/* Card Sobrou/Faltou */}
            <div className="bg-card border border-border rounded-xl p-3">
              <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-2 ${saldo >= 0 ? 'bg-blue-500/10 text-blue-600' : 'bg-vermelho/10 text-vermelho'}`}>
                {saldo >= 0 ? 'Sobrou' : 'Faltou'}
              </span>
              <p className={`text-[17px] font-semibold leading-none ${saldo >= 0 ? 'text-blue-600' : 'text-vermelho'}`}>
                {formatarMoeda(Math.abs(saldo))}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
