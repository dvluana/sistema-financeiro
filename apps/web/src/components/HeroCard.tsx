/**
 * HeroCard Component
 *
 * Card principal da dashboard com saudação contextual,
 * valores de entradas/saídas e resumo do saldo.
 */

import { Card } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/utils'

interface HeroCardProps {
  mes: string
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

/**
 * Retorna nome do mês por extenso em minúsculo
 */
function getMesExtenso(mes: string): string {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ]
  const [, month] = mes.split('-')
  return meses[parseInt(month) - 1]
}

export function HeroCard({
  mes,
  nome,
  saldo,
  jaEntrou,
  jaPaguei,
  pendentesEntrada,
  pendentesSaida,
}: HeroCardProps) {
  const saudacao = getSaudacao()
  const mesExtenso = getMesExtenso(mes)

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

  // Frase do saldo
  const getFraseSaldo = () => {
    if (saldo > 0) {
      return { texto: `Sobrou ${formatarMoeda(saldo)} em ${mesExtenso}`, cor: 'text-[#008A05]' }
    } else if (saldo < 0) {
      return { texto: `Faltou ${formatarMoeda(Math.abs(saldo))} em ${mesExtenso}`, cor: 'text-[#D93025]' }
    } else {
      return { texto: `Fechou certinho em ${mesExtenso} ✓`, cor: 'text-[#222222]' }
    }
  }

  const fraseSaldo = getFraseSaldo()
  const pendentesEntradaTexto = getPendentesEntradaTexto()
  const pendentesSaidaTexto = getPendentesSaidaTexto()

  return (
    <Card className="hover:border-rosa/50 transition-colors p-4">
      {/* Header: Saudação + Valores lado a lado */}
      <div className="flex items-start justify-between mb-3">
        {/* Saudação */}
        <div>
          <p className="text-[11px] text-neutro-400 uppercase tracking-wider">
            {saudacao.texto}
          </p>
          <p className="text-[18px] font-semibold text-neutro-900 leading-tight">
            {nome} {saudacao.emoji}
          </p>
        </div>
      </div>

      {/* Valores Entrou/Saiu - mais compacto */}
      <div className="flex gap-6 mb-3">
        {/* Coluna Entrou */}
        <div>
          <p className="text-[12px] text-neutro-500 mb-0.5">Entrou</p>
          <p className="text-[20px] font-bold text-verde leading-none">
            {formatarMoeda(jaEntrou)}
          </p>
          {pendentesEntradaTexto && (
            <p className="text-[11px] text-neutro-400 mt-0.5">
              {pendentesEntradaTexto}
            </p>
          )}
        </div>

        {/* Coluna Saiu */}
        <div>
          <p className="text-[12px] text-neutro-500 mb-0.5">Saiu</p>
          <p className="text-[20px] font-bold text-vermelho leading-none">
            {formatarMoeda(jaPaguei)}
          </p>
          {pendentesSaidaTexto && (
            <p className="text-[11px] text-neutro-400 mt-0.5">
              {pendentesSaidaTexto}
            </p>
          )}
        </div>
      </div>

      {/* Frase do saldo */}
      <p className={`text-[14px] font-medium ${fraseSaldo.cor}`}>
        {fraseSaldo.texto}
      </p>
    </Card>
  )
}
