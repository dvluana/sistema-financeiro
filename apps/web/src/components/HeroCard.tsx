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
    <Card className="hover:border-rosa/50 transition-colors">
      {/* Saudação estilizada */}
      <div className="mb-5">
        <p className="text-micro text-neutro-400 uppercase tracking-wider mb-0.5">
          {saudacao.texto}
        </p>
        <p className="text-[22px] font-semibold text-neutro-900">
          {nome} <span className="font-normal">{saudacao.emoji}</span>
        </p>
      </div>

      {/* Valores Entrou/Saiu */}
      <div className="flex gap-4 mb-4">
        {/* Coluna Entrou */}
        <div className="flex-1">
          <p className="text-[14px] text-[#717171] mb-1">Entrou</p>
          <p className="text-[24px] font-bold text-[#008A05]">
            {formatarMoeda(jaEntrou)}
          </p>
          {pendentesEntradaTexto && (
            <p className="text-[13px] text-[#9CA3AF] mt-0.5">
              {pendentesEntradaTexto}
            </p>
          )}
        </div>

        {/* Coluna Saiu */}
        <div className="flex-1">
          <p className="text-[14px] text-[#717171] mb-1">Saiu</p>
          <p className="text-[24px] font-bold text-[#D93025]">
            {formatarMoeda(jaPaguei)}
          </p>
          {pendentesSaidaTexto && (
            <p className="text-[13px] text-[#9CA3AF] mt-0.5">
              {pendentesSaidaTexto}
            </p>
          )}
        </div>
      </div>

      {/* Frase do saldo */}
      <p className={`text-[16px] font-medium ${fraseSaldo.cor}`}>
        {fraseSaldo.texto}
      </p>
    </Card>
  )
}
