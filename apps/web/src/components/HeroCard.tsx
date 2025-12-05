/**
 * HeroCard Component
 *
 * Card principal da dashboard com saudação contextual,
 * valores de entradas/saídas e resumo do saldo.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
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
}: HeroCardProps) {
  const saudacao = getSaudacao()

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
          <p className="text-[11px] text-neutro-400 uppercase tracking-wider">
            {saudacao.texto}
          </p>
          <p className="text-[20px] font-semibold text-neutro-900 leading-tight">
            {nome} {saudacao.emoji}
          </p>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMesAnterior}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-lg transition-all',
              'hover:bg-neutro-100 active:scale-95 text-neutro-600'
            )}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-pequeno font-medium text-neutro-700 min-w-[70px] text-center">
            {formatarMes(mesSelecionado)}
          </span>
          <button
            type="button"
            onClick={onMesProximo}
            disabled={!podeAvancar}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-lg transition-all',
              'hover:bg-neutro-100 active:scale-95',
              podeAvancar ? 'text-neutro-600' : 'text-neutro-300 cursor-not-allowed'
            )}
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards de valores - mesmo estilo dos vencimentos */}
      <div className="grid grid-cols-3 gap-2">
        {/* Card Entrou */}
        <div className="bg-white border border-neutro-200 rounded-xl p-3">
          <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-verde/10 text-verde mb-2">
            Entrou
          </span>
          <p className="text-[17px] font-semibold text-neutro-900 leading-none">
            {formatarMoeda(jaEntrou)}
          </p>
          {pendentesEntradaTexto && (
            <p className="text-[10px] text-verde mt-1.5">
              {pendentesEntradaTexto}
            </p>
          )}
        </div>

        {/* Card Saiu */}
        <div className="bg-white border border-neutro-200 rounded-xl p-3">
          <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-vermelho/10 text-vermelho mb-2">
            Saiu
          </span>
          <p className="text-[17px] font-semibold text-neutro-900 leading-none">
            {formatarMoeda(jaPaguei)}
          </p>
          {pendentesSaidaTexto && (
            <p className="text-[10px] text-vermelho mt-1.5">
              {pendentesSaidaTexto}
            </p>
          )}
        </div>

        {/* Card Sobrou/Faltou */}
        <div className="bg-white border border-neutro-200 rounded-xl p-3">
          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-2 ${saldo >= 0 ? 'bg-blue-500/10 text-blue-600' : 'bg-vermelho/10 text-vermelho'}`}>
            {saldo >= 0 ? 'Sobrou' : 'Faltou'}
          </span>
          <p className={`text-[17px] font-semibold leading-none ${saldo >= 0 ? 'text-blue-600' : 'text-vermelho'}`}>
            {formatarMoeda(Math.abs(saldo))}
          </p>
        </div>
      </div>
    </div>
  )
}
