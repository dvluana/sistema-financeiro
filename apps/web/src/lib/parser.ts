/**
 * Parser de texto para lançamentos rápidos
 * Interpreta texto natural e extrai informações de lançamentos financeiros
 */

export type TipoLancamento = 'entrada' | 'saida'

export interface ParsedLancamento {
  id: string
  tipo: TipoLancamento
  nome: string
  valor: number | null
  mes: string // YYYY-MM
  diaPrevisto: number | null
  status: 'completo' | 'incompleto'
  camposFaltantes: ('valor' | 'nome')[]
}

export interface ParseResult {
  lancamentos: ParsedLancamento[]
  textoOriginal: string
}

// Palavras-chave para detectar tipo
const PALAVRAS_ENTRADA = [
  'recebi', 'receber', 'recebendo', 'recebido',
  'entrada', 'entrou',
  'salário', 'salario', 'sal',
  'pagamento recebido',
  'freelance', 'freela',
  'venda', 'vendi', 'vendendo',
  'rendimento', 'renda',
  'depósito', 'deposito', 'depositado',
  'transferência recebida', 'transferencia recebida',
  'pix recebido', 'recebi pix',
  'ganho', 'ganhei', 'ganhando',
  'bônus', 'bonus',
  'comissão', 'comissao',
  'dividendo', 'dividendos',
  'reembolso', 'reembolsado'
]

const PALAVRAS_SAIDA = [
  'gastei', 'gastar', 'gastando', 'gasto',
  'paguei', 'pagar', 'pagando', 'pago',
  'comprei', 'comprar', 'comprando', 'compra',
  'parcela', 'parcelas',
  'conta', 'contas',
  'boleto', 'boletos',
  'fatura',
  'despesa', 'despesas',
  'saída', 'saida', 'saiu',
  'débito', 'debito', 'debitado',
  'mensalidade',
  'assinatura',
  'aluguel',
  'luz', 'água', 'agua', 'gás', 'gas',
  'internet', 'telefone', 'celular',
  'mercado', 'supermercado', 'feira',
  'combustível', 'combustivel', 'gasolina',
  'uber', 'taxi', 'transporte',
  'restaurante', 'lanche', 'comida',
  'farmácia', 'farmacia', 'remédio', 'remedio'
]

// Mapeamento de meses
const MESES_MAP: Record<string, number> = {
  'janeiro': 1, 'jan': 1, 'janeiro/': 1,
  'fevereiro': 2, 'fev': 2, 'fevereiro/': 2,
  'março': 3, 'marco': 3, 'mar': 3, 'março/': 3,
  'abril': 4, 'abr': 4, 'abril/': 4,
  'maio': 5, 'mai': 5, 'maio/': 5,
  'junho': 6, 'jun': 6, 'junho/': 6,
  'julho': 7, 'jul': 7, 'julho/': 7,
  'agosto': 8, 'ago': 8, 'agosto/': 8,
  'setembro': 9, 'set': 9, 'setembro/': 9,
  'outubro': 10, 'out': 10, 'outubro/': 10,
  'novembro': 11, 'nov': 11, 'novembro/': 11,
  'dezembro': 12, 'dez': 12, 'dezembro/': 12
}

/**
 * Gera ID único para cada lançamento parseado
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

/**
 * Retorna o mês atual no formato YYYY-MM
 */
function getMesAtual(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Retorna o ano atual
 */
function getAnoAtual(): number {
  return new Date().getFullYear()
}

/**
 * Converte mês e ano para formato YYYY-MM
 */
function formatarMes(mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/**
 * Extrai valor do texto
 * Suporta: 5000, 5.000, 5000.00, 5.000,00, R$ 5.000, R$5000, 5k, 5mil
 */
function extrairValor(texto: string): { valor: number | null; textoRestante: string } {
  let textoRestante = texto

  // Padrão: R$ com ou sem espaço, seguido de número
  // Ex: R$ 5.000,00 | R$5000 | R$ 5000.00
  const regexRS = /R\$\s*([\d.,]+)/gi
  let match = regexRS.exec(texto)
  if (match) {
    const valorStr = match[1]
    const valor = parseValorString(valorStr)
    if (valor !== null) {
      textoRestante = texto.replace(match[0], ' ').trim()
      return { valor, textoRestante }
    }
  }

  // Padrão: número com k ou mil
  // Ex: 5k, 5mil, 5 mil, 10k
  const regexKMil = /(\d+)\s*(k|mil)\b/gi
  match = regexKMil.exec(texto)
  if (match) {
    const valor = parseInt(match[1]) * 1000
    textoRestante = texto.replace(match[0], ' ').trim()
    return { valor, textoRestante }
  }

  // Padrão: número com formato brasileiro ou internacional
  // Ex: 5.000,00 | 5000.00 | 5000 | 5,000.00
  // Prioriza formatos mais específicos (com decimais)
  const regexNumero = /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{1,2})?)\b/g
  const matches = [...texto.matchAll(regexNumero)]

  // Pega o maior número encontrado (geralmente é o valor)
  let maiorValor: number | null = null
  let matchUsado: RegExpMatchArray | null = null

  for (const m of matches) {
    const valor = parseValorString(m[1])
    if (valor !== null && (maiorValor === null || valor > maiorValor)) {
      maiorValor = valor
      matchUsado = m
    }
  }

  if (maiorValor !== null && matchUsado) {
    textoRestante = texto.replace(matchUsado[0], ' ').trim()
    return { valor: maiorValor, textoRestante }
  }

  return { valor: null, textoRestante }
}

/**
 * Converte string de valor para número
 */
function parseValorString(str: string): number | null {
  if (!str) return null

  // Remove espaços
  str = str.trim()

  // Detecta formato brasileiro (1.234,56) vs internacional (1,234.56)
  const temVirgula = str.includes(',')
  const temPonto = str.includes('.')

  let valorLimpo: string

  if (temVirgula && temPonto) {
    // Formato: 1.234,56 (BR) ou 1,234.56 (INT)
    // Se vírgula vem depois do ponto, é formato BR
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Formato brasileiro: 1.234,56
      valorLimpo = str.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato internacional: 1,234.56
      valorLimpo = str.replace(/,/g, '')
    }
  } else if (temVirgula) {
    // Pode ser 1234,56 (BR decimal) ou 1,234 (INT separador de milhar)
    // Se tem exatamente 2 dígitos após vírgula, assume decimal BR
    if (/,\d{2}$/.test(str)) {
      valorLimpo = str.replace(',', '.')
    } else {
      // Separador de milhar internacional
      valorLimpo = str.replace(/,/g, '')
    }
  } else if (temPonto) {
    // Pode ser 1234.56 (decimal) ou 1.234 (separador de milhar BR)
    // Se tem exatamente 3 dígitos após o último ponto, pode ser milhar
    if (/\.\d{3}$/.test(str) && !/\.\d{3}\.\d{3}/.test(str)) {
      // Único ponto com 3 dígitos depois - provavelmente milhar
      // Ex: 5.000 = 5000
      valorLimpo = str.replace(/\./g, '')
    } else {
      // Decimal normal
      valorLimpo = str
    }
  } else {
    valorLimpo = str
  }

  const valor = parseFloat(valorLimpo)
  return isNaN(valor) ? null : valor
}

/**
 * Extrai mês do texto
 * Suporta: outubro, out, 10/2025, 10/25, out/25
 */
function extrairMes(texto: string): { mes: string | null; textoRestante: string } {
  const textoLower = texto.toLowerCase()
  let textoRestante = texto

  // Padrão: MM/YYYY ou MM/YY
  const regexNumerico = /\b(\d{1,2})\/(\d{2,4})\b/g
  let match = regexNumerico.exec(textoLower)
  if (match) {
    const mesNum = parseInt(match[1])
    let ano = parseInt(match[2])
    if (ano < 100) ano += 2000

    if (mesNum >= 1 && mesNum <= 12) {
      textoRestante = texto.replace(match[0], ' ').trim()
      return { mes: formatarMes(mesNum, ano), textoRestante }
    }
  }

  // Padrão: nome_mes/YY ou nome_mes/YYYY
  const regexMesAno = /\b(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[\s/]*(de\s+)?(\d{2,4})\b/gi
  match = regexMesAno.exec(texto)
  if (match) {
    const mesNome = match[1].toLowerCase()
    let ano = parseInt(match[3])
    if (ano < 100) ano += 2000

    const mesNum = MESES_MAP[mesNome]
    if (mesNum) {
      textoRestante = texto.replace(match[0], ' ').trim()
      return { mes: formatarMes(mesNum, ano), textoRestante }
    }
  }

  // Padrão: apenas nome do mês (assume ano atual)
  for (const [nome, num] of Object.entries(MESES_MAP)) {
    const regex = new RegExp(`\\b${nome}\\b`, 'gi')
    if (regex.test(textoLower)) {
      textoRestante = texto.replace(regex, ' ').trim()
      return { mes: formatarMes(num, getAnoAtual()), textoRestante }
    }
  }

  return { mes: null, textoRestante }
}

/**
 * Extrai período de recorrência do texto
 * Suporta: "de out até dez", "out a dez", "por 3 meses", "próximos 4 meses"
 */
function extrairPeriodo(texto: string): { meses: string[] | null; textoRestante: string } {
  let textoRestante = texto

  // Padrão: "por X meses" ou "próximos X meses"
  const regexPorMeses = /\b(por|próximos?|proximos?)\s+(\d+)\s+mes(es)?\b/gi
  let match = regexPorMeses.exec(texto)
  if (match) {
    const quantidade = parseInt(match[2])
    const meses = gerarMesesAPartirDe(getMesAtual(), quantidade)
    textoRestante = texto.replace(match[0], ' ').trim()
    return { meses, textoRestante }
  }

  // Padrão: "mes1 até mes2" ou "mes1 a mes2" ou "de mes1 até mes2"
  const regexAte = /\b(de\s+)?(\w+)\/(\d{2,4})\s*(até|a|ate)\s*(\w+)\/(\d{2,4})\b/gi
  match = regexAte.exec(texto)
  if (match) {
    const mesInicio = parseMesString(match[2], match[3])
    const mesFim = parseMesString(match[5], match[6])

    if (mesInicio && mesFim) {
      const meses = gerarMesesEntre(mesInicio, mesFim)
      textoRestante = texto.replace(match[0], ' ').trim()
      return { meses, textoRestante }
    }
  }

  // Padrão simplificado: "out até dez" ou "outubro a dezembro" (assume ano atual)
  const regexAteSimples = /\b(de\s+)?(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s*(até|a|ate)\s*(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/gi
  match = regexAteSimples.exec(texto)
  if (match) {
    const mesInicioNum = MESES_MAP[match[2].toLowerCase()]
    const mesFimNum = MESES_MAP[match[4].toLowerCase()]

    if (mesInicioNum && mesFimNum) {
      const anoAtual = getAnoAtual()
      const mesInicio = formatarMes(mesInicioNum, anoAtual)
      // Se mês fim é menor que início, assume próximo ano
      const anoFim = mesFimNum < mesInicioNum ? anoAtual + 1 : anoAtual
      const mesFim = formatarMes(mesFimNum, anoFim)

      const meses = gerarMesesEntre(mesInicio, mesFim)
      textoRestante = texto.replace(match[0], ' ').trim()
      return { meses, textoRestante }
    }
  }

  return { meses: null, textoRestante }
}

/**
 * Converte nome/número de mês e ano para formato YYYY-MM
 */
function parseMesString(mesStr: string, anoStr: string): string | null {
  let mesNum: number

  // Tenta como número primeiro
  const mesNumerico = parseInt(mesStr)
  if (!isNaN(mesNumerico) && mesNumerico >= 1 && mesNumerico <= 12) {
    mesNum = mesNumerico
  } else {
    // Tenta como nome
    mesNum = MESES_MAP[mesStr.toLowerCase()]
    if (!mesNum) return null
  }

  let ano = parseInt(anoStr)
  if (isNaN(ano)) return null
  if (ano < 100) ano += 2000

  return formatarMes(mesNum, ano)
}

/**
 * Gera array de meses a partir de um mês inicial
 */
function gerarMesesAPartirDe(mesInicial: string, quantidade: number): string[] {
  const meses: string[] = []
  const [ano, mes] = mesInicial.split('-').map(Number)

  for (let i = 0; i < quantidade; i++) {
    let novoMes = mes + i
    let novoAno = ano

    while (novoMes > 12) {
      novoMes -= 12
      novoAno++
    }

    meses.push(formatarMes(novoMes, novoAno))
  }

  return meses
}

/**
 * Gera array de meses entre dois meses (inclusive)
 */
function gerarMesesEntre(mesInicio: string, mesFim: string): string[] {
  const meses: string[] = []
  const [anoInicio, mesInicioNum] = mesInicio.split('-').map(Number)
  const [anoFim, mesFimNum] = mesFim.split('-').map(Number)

  let ano = anoInicio
  let mes = mesInicioNum

  while (ano < anoFim || (ano === anoFim && mes <= mesFimNum)) {
    meses.push(formatarMes(mes, ano))
    mes++
    if (mes > 12) {
      mes = 1
      ano++
    }

    // Proteção contra loop infinito
    if (meses.length > 120) break // Máximo 10 anos
  }

  return meses
}

/**
 * Extrai dia previsto do texto
 * Suporta: "dia 5", "todo dia 10", "vence dia 15", "no dia 20"
 */
function extrairDia(texto: string): { dia: number | null; textoRestante: string } {
  let textoRestante = texto

  // Padrão: "dia X" com variações
  const regexDia = /\b(todo\s+)?dia\s+(\d{1,2})\b/gi
  const match = regexDia.exec(texto)
  if (match) {
    const dia = parseInt(match[2])
    if (dia >= 1 && dia <= 31) {
      textoRestante = texto.replace(match[0], ' ').trim()
      return { dia, textoRestante }
    }
  }

  // Padrão: "vence dia X", "vencimento dia X"
  const regexVence = /\b(vence|vencimento)\s+(no\s+)?dia\s+(\d{1,2})\b/gi
  const matchVence = regexVence.exec(texto)
  if (matchVence) {
    const dia = parseInt(matchVence[3])
    if (dia >= 1 && dia <= 31) {
      textoRestante = texto.replace(matchVence[0], ' ').trim()
      return { dia, textoRestante }
    }
  }

  return { dia: null, textoRestante }
}

/**
 * Detecta tipo do lançamento baseado em palavras-chave
 */
function detectarTipo(texto: string): TipoLancamento {
  const textoLower = texto.toLowerCase()

  // Verifica palavras de entrada primeiro (menos comuns)
  for (const palavra of PALAVRAS_ENTRADA) {
    if (textoLower.includes(palavra)) {
      return 'entrada'
    }
  }

  // Verifica palavras de saída
  for (const palavra of PALAVRAS_SAIDA) {
    if (textoLower.includes(palavra)) {
      return 'saida'
    }
  }

  // Default é saída (mais comum no dia a dia)
  return 'saida'
}

/**
 * Extrai nome do lançamento (o que sobra após remover valor, data, tipo)
 */
function extrairNome(texto: string): string {
  // Remove palavras auxiliares do início e fim
  const palavrasRemover = [
    'de', 'do', 'da', 'dos', 'das',
    'no', 'na', 'nos', 'nas',
    'para', 'pra', 'pro',
    'com', 'em', 'ao', 'à',
    'o', 'a', 'os', 'as',
    'um', 'uma', 'uns', 'umas',
    'e', 'ou'
  ]

  let nome = texto.trim()

  // Remove múltiplos espaços
  nome = nome.replace(/\s+/g, ' ')

  // Remove palavras auxiliares do início
  for (const palavra of palavrasRemover) {
    const regex = new RegExp(`^${palavra}\\s+`, 'i')
    nome = nome.replace(regex, '')
  }

  // Remove palavras auxiliares do fim
  for (const palavra of palavrasRemover) {
    const regex = new RegExp(`\\s+${palavra}$`, 'i')
    nome = nome.replace(regex, '')
  }

  // Remove palavras-chave de tipo que podem ter sobrado
  const todasPalavras = [...PALAVRAS_ENTRADA, ...PALAVRAS_SAIDA]
  for (const palavra of todasPalavras) {
    const regex = new RegExp(`\\b${palavra}\\b`, 'gi')
    nome = nome.replace(regex, '')
  }

  // Limpa espaços extras novamente
  nome = nome.replace(/\s+/g, ' ').trim()

  // Capitaliza primeira letra
  if (nome.length > 0) {
    nome = nome.charAt(0).toUpperCase() + nome.slice(1)
  }

  return nome
}

/**
 * Parseia uma única linha de texto
 */
function parseLinha(texto: string, mesDefault: string): ParsedLancamento[] {
  if (!texto.trim()) return []

  const lancamentos: ParsedLancamento[] = []

  // Detecta tipo primeiro (antes de modificar o texto)
  const tipo = detectarTipo(texto)

  // Extrai valor
  const { valor, textoRestante: textoSemValor } = extrairValor(texto)

  // Extrai dia previsto
  const { dia: diaPrevisto, textoRestante: textoSemDia } = extrairDia(textoSemValor)

  // Extrai período (recorrência)
  const { meses: mesesRecorrencia, textoRestante: textoSemPeriodo } = extrairPeriodo(textoSemDia)

  // Extrai mês único
  const { mes: mesUnico, textoRestante: textoSemMes } = extrairMes(textoSemPeriodo)

  // Extrai nome
  const nome = extrairNome(textoSemMes)

  // Determina campos faltantes
  const camposFaltantes: ('valor' | 'nome')[] = []
  if (valor === null) camposFaltantes.push('valor')
  if (!nome) camposFaltantes.push('nome')

  const status = camposFaltantes.length > 0 ? 'incompleto' : 'completo'

  // Se tem recorrência, cria múltiplos lançamentos
  if (mesesRecorrencia && mesesRecorrencia.length > 0) {
    for (const mes of mesesRecorrencia) {
      lancamentos.push({
        id: generateId(),
        tipo,
        nome: nome || '',
        valor,
        mes,
        diaPrevisto,
        status,
        camposFaltantes
      })
    }
  } else {
    // Lançamento único
    const mes = mesUnico || mesDefault
    lancamentos.push({
      id: generateId(),
      tipo,
      nome: nome || '',
      valor,
      mes,
      diaPrevisto,
      status,
      camposFaltantes
    })
  }

  return lancamentos
}

/**
 * Função principal do parser
 * Recebe texto (pode ter múltiplas linhas) e retorna lançamentos interpretados
 */
export function parseInput(texto: string, mesDefault?: string): ParseResult {
  const mesAtual = mesDefault || getMesAtual()
  const linhas = texto.split('\n').filter(l => l.trim())

  const lancamentos: ParsedLancamento[] = []

  for (const linha of linhas) {
    const resultados = parseLinha(linha, mesAtual)
    lancamentos.push(...resultados)
  }

  return {
    lancamentos,
    textoOriginal: texto
  }
}

/**
 * Formata valor para exibição
 */
export function formatarValor(valor: number | null): string {
  if (valor === null) return '—'
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

/**
 * Formata mês para exibição
 */
export function formatarMesExibicao(mes: string): string {
  const [ano, mesNum] = mes.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[parseInt(mesNum) - 1]}/${ano.slice(2)}`
}

/**
 * Agrupa lançamentos por nome para mostrar recorrências
 */
export function agruparRecorrencias(lancamentos: ParsedLancamento[]): Map<string, ParsedLancamento[]> {
  const grupos = new Map<string, ParsedLancamento[]>()

  for (const lancamento of lancamentos) {
    const chave = `${lancamento.tipo}-${lancamento.nome}-${lancamento.valor}`
    const grupo = grupos.get(chave) || []
    grupo.push(lancamento)
    grupos.set(chave, grupo)
  }

  return grupos
}
