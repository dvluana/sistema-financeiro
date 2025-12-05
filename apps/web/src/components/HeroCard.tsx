/**
 * HeroCard Component
 *
 * Card principal da dashboard com saudação contextual,
 * valores de entradas/saídas e resumo do saldo.
 */

import { formatarMoeda } from '@/lib/utils'

interface HeroCardProps {
  nome: string
  saldo: number
  jaEntrou: number
  jaPaguei: number
  pendentesEntrada: number
  pendentesSaida: number
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

export function HeroCard({
  nome,
  saldo,
  jaEntrou,
  jaPaguei,
  pendentesEntrada,
  pendentesSaida,
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
      {/* Saudação */}
      <div className="px-1">
        <p className="text-[11px] text-neutro-400 uppercase tracking-wider">
          {saudacao.texto}
        </p>
        <p className="text-[20px] font-semibold text-neutro-900 leading-tight">
          {nome} {saudacao.emoji}
        </p>
      </div>

      {/* Cards de valores - mesmo estilo dos vencimentos */}
      <div className="grid grid-cols-3 gap-2">
        {/* Card Entrou */}
        <div className="bg-white border border-neutro-200 rounded-xl p-3">
          <p className="text-[10px] font-medium text-neutro-400 mb-1">Entrou</p>
          <p className="text-[15px] font-semibold text-neutro-900 leading-none">
            {formatarMoeda(jaEntrou)}
          </p>
          {pendentesEntradaTexto && (
            <p className="text-[10px] text-verde mt-1">
              {pendentesEntradaTexto}
            </p>
          )}
        </div>

        {/* Card Saiu */}
        <div className="bg-white border border-neutro-200 rounded-xl p-3">
          <p className="text-[10px] font-medium text-neutro-400 mb-1">Saiu</p>
          <p className="text-[15px] font-semibold text-neutro-900 leading-none">
            {formatarMoeda(jaPaguei)}
          </p>
          {pendentesSaidaTexto && (
            <p className="text-[10px] text-vermelho mt-1">
              {pendentesSaidaTexto}
            </p>
          )}
        </div>

        {/* Card Sobrou/Faltou */}
        <div className="bg-white border border-neutro-200 rounded-xl p-3">
          <p className="text-[10px] font-medium text-neutro-400 mb-1">
            {saldo >= 0 ? 'Sobrou' : 'Faltou'}
          </p>
          <p className={`text-[15px] font-semibold leading-none ${saldo >= 0 ? 'text-verde' : 'text-vermelho'}`}>
            {formatarMoeda(Math.abs(saldo))}
          </p>
        </div>
      </div>
    </div>
  )
}
