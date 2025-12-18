/**
 * Parser robusto de texto para lançamentos financeiros
 * Detecta automaticamente o formato da entrada e extrai informações
 *
 * Formatos suportados:
 * - Texto livre (digitado manualmente)
 * - TSV (dados colados de Excel/Google Sheets)
 * - CSV (separado por vírgula ou ponto-vírgula)
 * - Extrato bancário (padrões comuns de extratos)
 */

export type TipoLancamento = 'entrada' | 'saida'
export type FormatoEntrada = 'texto-livre' | 'csv' | 'tsv' | 'extrato'
export type StatusItem = 'completo' | 'atencao' | 'incompleto'

export interface ParsedLancamento {
  id: string
  tipo: TipoLancamento
  nome: string
  valor: number | null
  mes: string // YYYY-MM
  diaPrevisto: number | null
  status: StatusItem
  camposFaltantes: ('valor' | 'nome')[]
  groupId: string
  avisos?: string[]
  erros?: string[]
  textoOriginal?: string
  // Categoria (opcional, ID da categoria padrão)
  categoriaId?: string | null
  // Recorrência (opcional)
  recorrencia?: {
    tipo: 'mensal' | 'parcelas'
    quantidade: number // 12 para mensal, ou número de parcelas
  }
  // Agrupador (grupo de lançamentos)
  isAgrupador?: boolean
  // Modo de cálculo do valor do agrupador
  valorModo?: 'soma' | 'fixo'
  // Já paguei/recebi
  concluido?: boolean
  // Data de vencimento (só para saídas)
  dataVencimento?: string | null
}

export interface ParseResult {
  lancamentos: ParsedLancamento[]
  textoOriginal: string
  formatoDetectado: FormatoEntrada
  mesExtraido?: string // Mês extraído do contexto global (ex: "tudo de janeiro")
  resumo: {
    total: number
    completos: number
    atencao: number
    incompletos: number
    totalEntradas: number
    totalSaidas: number
  }
}

// ============================================================================
// PALAVRAS-CHAVE PARA DETECÇÃO DE TIPO
// ============================================================================

const PALAVRAS_ENTRADA = [
  // Verbos de recebimento
  'recebi', 'receber', 'recebendo', 'recebido', 'recebemos',
  'ganhei', 'ganhar', 'ganhando', 'ganho', 'ganhamos',
  'vendi', 'vender', 'vendendo', 'vendido', 'vendemos',
  // Substantivos de entrada
  'entrada', 'entrou', 'entradas',
  'salário', 'salario', 'sal', 'salários', 'salarios',
  'freelance', 'freela', 'freelancer',
  'rendimento', 'renda', 'rendimentos', 'rendas',
  'depósito', 'deposito', 'depositado', 'depósitos', 'depositos',
  'dividendo', 'dividendos',
  'reembolso', 'reembolsado', 'reembolsos',
  'bônus', 'bonus', 'bonificação', 'bonificacao',
  'comissão', 'comissao', 'comissões', 'comissoes',
  'lucro', 'lucros', 'lucrei',
  'faturamento', 'faturei', 'faturado',
  'prêmio', 'premio', 'prêmios', 'premios',
  'restituição', 'restituicao',
  'resgate', 'resgatei', 'resgatado',
  // Contextos de entrada
  'pagamento recebido', 'transferência recebida', 'transferencia recebida',
  'pix recebido', 'recebi pix', 'ted recebida', 'doc recebido',
  'venda de', 'vendas de',
]

const PALAVRAS_SAIDA = [
  // Verbos de gasto
  'gastei', 'gastar', 'gastando', 'gasto', 'gastamos',
  'paguei', 'pagar', 'pagando', 'pago', 'pagamos',
  'comprei', 'comprar', 'comprando', 'compra', 'compramos',
  'perdi', 'perder', 'perdendo', 'perdido',
  // Substantivos de saída
  'parcela', 'parcelas',
  'conta', 'contas',
  'boleto', 'boletos',
  'fatura', 'faturas',
  'despesa', 'despesas',
  'saída', 'saida', 'saiu', 'saídas', 'saidas',
  'débito', 'debito', 'debitado', 'débitos', 'debitos',
  'mensalidade', 'mensalidades',
  'assinatura', 'assinaturas',
  'aluguel', 'aluguéis', 'alugueis',
  // Contas de casa
  'luz', 'energia', 'elétrica', 'eletrica',
  'água', 'agua',
  'gás', 'gas',
  'internet', 'telefone', 'celular', 'fone',
  'condomínio', 'condominio',
  'iptu', 'ipva',
  // Compras e serviços
  'mercado', 'supermercado', 'feira', 'hortifruti',
  'farmácia', 'farmacia', 'remédio', 'remedio', 'medicamento',
  'combustível', 'combustivel', 'gasolina', 'etanol', 'álcool', 'alcool',
  'uber', 'taxi', 'táxi', '99', 'transporte', 'ônibus', 'onibus', 'metrô', 'metro',
  'restaurante', 'lanche', 'comida', 'almoço', 'almoco', 'janta', 'jantar',
  'ifood', 'rappi', 'delivery',
  // Assinaturas comuns
  'netflix', 'spotify', 'amazon', 'prime', 'hbo', 'disney', 'globoplay',
  'youtube', 'deezer', 'apple music',
  // Cartões e bancos
  'cartão', 'cartao', 'crédito', 'credito',
  'anuidade', 'tarifa', 'taxa', 'juros', 'multa',
  // Educação e saúde
  'escola', 'faculdade', 'curso', 'mensalidade escolar',
  'plano de saúde', 'plano de saude', 'convênio', 'convenio',
  'academia', 'gym',
  // Outros
  'presente', 'gift', 'doação', 'doacao',
  'imposto', 'impostos', 'tributo', 'tributos',
  'seguro', 'seguros',
]

// Indicadores de tipo no extrato bancário
const INDICADORES_CREDITO = ['c', 'cr', 'cred', 'crédito', 'credito', '+']
const INDICADORES_DEBITO = ['d', 'db', 'deb', 'débito', 'debito', '-']

// ============================================================================
// MAPEAMENTO DE MESES
// ============================================================================

const MESES_MAP: Record<string, number> = {
  'janeiro': 1, 'jan': 1,
  'fevereiro': 2, 'fev': 2,
  'março': 3, 'marco': 3, 'mar': 3,
  'abril': 4, 'abr': 4,
  'maio': 5, 'mai': 5,
  'junho': 6, 'jun': 6,
  'julho': 7, 'jul': 7,
  'agosto': 8, 'ago': 8,
  'setembro': 9, 'set': 9,
  'outubro': 10, 'out': 10,
  'novembro': 11, 'nov': 11,
  'dezembro': 12, 'dez': 12,
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function getMesAtual(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getAnoAtual(): number {
  return new Date().getFullYear()
}

function formatarMes(mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

// ============================================================================
// DETECÇÃO AUTOMÁTICA DE FORMATO
// ============================================================================

/**
 * Detecta automaticamente o formato da entrada
 */
export function detectarFormato(input: string): FormatoEntrada {
  const linhas = input.trim().split('\n').filter(l => l.trim())
  if (linhas.length === 0) return 'texto-livre'

  const primeiraLinha = linhas[0]
  const todasLinhas = linhas.join('\n')

  // Se tem tab, provavelmente veio de planilha (copy/paste do Excel/Sheets)
  if (todasLinhas.includes('\t')) {
    // Verifica se é consistente (múltiplas tabs por linha)
    const tabsCount = linhas.map(l => (l.match(/\t/g) || []).length)
    const temTabsConsistentes = tabsCount.every(c => c > 0 && c === tabsCount[0])
    if (temTabsConsistentes || tabsCount[0] >= 2) {
      return 'tsv'
    }
  }

  // Se tem padrão CSV (3+ campos separados por vírgula ou ponto-vírgula)
  const camposPorVirgula = primeiraLinha.split(',').length
  const camposPorPontoVirgula = primeiraLinha.split(';').length

  if (camposPorVirgula >= 3 || camposPorPontoVirgula >= 3) {
    // Verifica se não é texto com vírgulas naturais (ex: "paguei 100, mercado")
    const pareceCSV = linhas.every(l => {
      const campos = l.split(camposPorVirgula >= 3 ? ',' : ';')
      return campos.length >= 3
    })
    if (pareceCSV) return 'csv'
  }

  // Se começa com data em padrão de extrato (dd/mm ou dd/mm/yyyy)
  const padraoExtrato = /^\d{2}\/\d{2}(\/\d{2,4})?\s+/
  if (padraoExtrato.test(primeiraLinha)) {
    // Verifica se múltiplas linhas seguem o padrão
    const linhasExtrato = linhas.filter(l => padraoExtrato.test(l))
    if (linhasExtrato.length >= linhas.length * 0.5) {
      return 'extrato'
    }
  }

  // Fallback: texto livre
  return 'texto-livre'
}

// ============================================================================
// EXTRAÇÃO DE VALOR (ROBUSTA)
// ============================================================================

interface ExtraidoValor {
  valor: number
  match: string
  posicao: number
  prioridade: number // Maior = mais específico (decimal > inteiro)
}

/**
 * Extrai valor monetário do texto com múltiplos padrões
 * Prioridade: formatos mais específicos (decimais) > inteiros
 */
function extrairValorRobusto(texto: string): ExtraidoValor | null {
  // Padrões ordenados por especificidade (maior prioridade primeiro)
  const padroes: Array<{ regex: RegExp; processador: (m: RegExpMatchArray) => number | null; prioridade: number }> = [
    // R$ 1.500,00 ou R$1500,00 (ALTA prioridade - explícito)
    {
      regex: /R\$\s*([\d.,]+)/gi,
      processador: (m) => parseNumero(m[1]),
      prioridade: 100
    },
    // Abreviação: 5k, 5.5k, 10k (ALTA prioridade - explícito)
    {
      regex: /\b(\d+(?:[.,]\d+)?)\s*k\b/gi,
      processador: (m) => {
        const num = parseFloat(m[1].replace(',', '.'))
        return isNaN(num) ? null : num * 1000
      },
      prioridade: 90
    },
    // Abreviação: 5 mil, 5mil, 5.5 mil (ALTA prioridade - explícito)
    {
      regex: /\b(\d+(?:[.,]\d+)?)\s*mil\b/gi,
      processador: (m) => {
        const num = parseFloat(m[1].replace(',', '.'))
        return isNaN(num) ? null : num * 1000
      },
      prioridade: 90
    },
    // Formato BR completo: 1.500,00 (ALTA prioridade - formato específico)
    {
      regex: /\b(\d{1,3}(?:\.\d{3})+,\d{2})\b/g,
      processador: (m) => parseNumero(m[1]),
      prioridade: 80
    },
    // Formato BR simples: 55,90 (MÉDIA-ALTA prioridade - decimal BR)
    {
      regex: /\b(\d+,\d{2})\b/g,
      processador: (m) => parseNumero(m[1]),
      prioridade: 70
    },
    // Formato INT: 1,500.00 ou 1500.00 (MÉDIA-ALTA prioridade - formato específico)
    {
      regex: /\b(\d{1,3}(?:,\d{3})*\.\d{2})\b/g,
      processador: (m) => parseNumero(m[1]),
      prioridade: 70
    },
    // Número com ponto decimal: 150.50 (MÉDIA prioridade)
    {
      regex: /\b(\d+\.\d{1,2})\b/g,
      processador: (m) => {
        const num = parseFloat(m[1])
        // Só aceita se for decimal (não milhar BR)
        return !isNaN(num) && num < 1000 ? num : null
      },
      prioridade: 60
    },
    // Número inteiro grande (>= 10) (BAIXA prioridade - menos específico)
    {
      regex: /\b(\d{2,})\b/g,
      processador: (m) => {
        const num = parseInt(m[1])
        return !isNaN(num) && num >= 10 ? num : null
      },
      prioridade: 10
    },
    // Zero explícito: "0,00" ou "0.00" (para grupos modo soma)
    {
      regex: /\b(0[,.]00)\b/g,
      processador: () => 0,
      prioridade: 70
    },
    // Zero simples: apenas "0" isolado (para grupos modo soma)
    {
      regex: /\b(0)\b(?![,.\d])/g,
      processador: () => 0,
      prioridade: 5
    },
  ]

  let melhorMatch: ExtraidoValor | null = null

  for (const { regex, processador, prioridade } of padroes) {
    regex.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(texto)) !== null) {
      const valor = processador(match)
      // Permite valor = 0 para grupos modo soma
      if (valor !== null && valor >= 0) {
        // Prioriza por: 1) prioridade do padrão, 2) valor maior em caso de empate
        const deveTrocar = !melhorMatch ||
          prioridade > melhorMatch.prioridade ||
          (prioridade === melhorMatch.prioridade && valor > melhorMatch.valor)

        if (deveTrocar) {
          melhorMatch = {
            valor,
            match: match[0],
            posicao: match.index,
            prioridade
          }
        }
      }
    }
  }

  return melhorMatch
}

/**
 * Converte string numérica para número, detectando formato BR/INT
 */
function parseNumero(str: string): number | null {
  if (!str) return null

  let limpo = str
    .replace(/R\$\s*/gi, '')
    .replace(/\s*(reais|real)\s*/gi, '')
    .trim()

  // Detecta formato BR (1.234,56) vs INT (1,234.56)
  const temVirgula = limpo.includes(',')
  const temPonto = limpo.includes('.')

  if (temVirgula && temPonto) {
    // Ambos presentes: verifica qual é decimal
    if (limpo.lastIndexOf(',') > limpo.lastIndexOf('.')) {
      // BR: 1.234,56
      limpo = limpo.replace(/\./g, '').replace(',', '.')
    } else {
      // INT: 1,234.56
      limpo = limpo.replace(/,/g, '')
    }
  } else if (temVirgula) {
    // Só vírgula: assume decimal BR se tem 2 dígitos depois
    if (/,\d{2}$/.test(limpo)) {
      limpo = limpo.replace(',', '.')
    } else {
      // Separador de milhar INT
      limpo = limpo.replace(/,/g, '')
    }
  } else if (temPonto) {
    // Só ponto: pode ser decimal ou milhar BR
    if (/\.\d{3}$/.test(limpo) && !/\.\d{3}\.\d{3}/.test(limpo)) {
      // Provavelmente milhar BR: 5.000
      limpo = limpo.replace(/\./g, '')
    }
    // Caso contrário mantém como decimal
  }

  const valor = parseFloat(limpo)
  return isNaN(valor) ? null : Math.round(valor * 100) / 100 // Arredonda para 2 casas
}

// ============================================================================
// EXTRAÇÃO DE DATA
// ============================================================================

interface ExtraidaData {
  data: string // YYYY-MM-DD
  mes: string // YYYY-MM
  dia: number
  match: string
}

/**
 * Extrai data do texto com múltiplos padrões
 */
function extrairDataRobusta(texto: string): ExtraidaData | null {
  const anoAtual = getAnoAtual()
  const mesAtual = new Date().getMonth() + 1

  const padroes: Array<{ regex: RegExp; extrator: (m: RegExpMatchArray) => ExtraidaData | null }> = [
    // dd/mm/yyyy ou dd-mm-yyyy
    {
      regex: /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/g,
      extrator: (m) => {
        const dia = parseInt(m[1])
        const mes = parseInt(m[2])
        const ano = parseInt(m[3])
        if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
          return {
            data: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
            mes: formatarMes(mes, ano),
            dia,
            match: m[0]
          }
        }
        return null
      }
    },
    // dd/mm/yy
    {
      regex: /\b(\d{2})[\/\-](\d{2})[\/\-](\d{2})\b/g,
      extrator: (m) => {
        const dia = parseInt(m[1])
        const mes = parseInt(m[2])
        let ano = parseInt(m[3])
        if (ano < 100) ano += 2000
        if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
          return {
            data: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
            mes: formatarMes(mes, ano),
            dia,
            match: m[0]
          }
        }
        return null
      }
    },
    // dd/mm (assume ano atual)
    {
      regex: /\b(\d{2})[\/\-](\d{2})(?!\d|[\/\-])/g,
      extrator: (m) => {
        const dia = parseInt(m[1])
        const mes = parseInt(m[2])
        if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
          // Se mês é anterior ao atual, assume próximo ano
          const ano = mes < mesAtual ? anoAtual + 1 : anoAtual
          return {
            data: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
            mes: formatarMes(mes, ano),
            dia,
            match: m[0]
          }
        }
        return null
      }
    },
    // "dia X" ou "todo dia X"
    {
      regex: /\b(?:todo\s+)?dia\s+(\d{1,2})\b/gi,
      extrator: (m) => {
        const dia = parseInt(m[1])
        if (dia >= 1 && dia <= 31) {
          return {
            data: '', // Sem data completa
            mes: getMesAtual(),
            dia,
            match: m[0]
          }
        }
        return null
      }
    },
  ]

  for (const { regex, extrator } of padroes) {
    regex.lastIndex = 0
    const match = regex.exec(texto)
    if (match) {
      const resultado = extrator(match)
      if (resultado) return resultado
    }
  }

  return null
}

// ============================================================================
// EXTRAÇÃO DE MÊS/PERÍODO
// ============================================================================

export interface ExtraidoMes {
  mes: string // YYYY-MM
  match: string
}

interface ExtraidoPeriodo {
  meses: string[] // Array de YYYY-MM
  match: string
}

/**
 * Extrai mês do texto
 */
function extrairMesRobusto(texto: string): ExtraidoMes | null {
  const textoLower = texto.toLowerCase()
  const anoAtual = getAnoAtual()

  // MM/YYYY ou MM/YY
  const regexNumerico = /\b(\d{1,2})[\/\-](\d{2,4})\b/g
  let match = regexNumerico.exec(textoLower)
  if (match) {
    const mesNum = parseInt(match[1])
    let ano = parseInt(match[2])
    if (ano < 100) ano += 2000
    if (mesNum >= 1 && mesNum <= 12) {
      return { mes: formatarMes(mesNum, ano), match: match[0] }
    }
  }

  // Nome do mês com ano: "outubro 2025", "out/25"
  const regexMesAno = /\b(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[\s\/]*(de\s+)?(\d{2,4})\b/gi
  match = regexMesAno.exec(texto)
  if (match) {
    const mesNome = match[1].toLowerCase()
    let ano = parseInt(match[3])
    if (ano < 100) ano += 2000
    const mesNum = MESES_MAP[mesNome]
    if (mesNum) {
      return { mes: formatarMes(mesNum, ano), match: match[0] }
    }
  }

  // Apenas nome do mês (assume ano atual)
  for (const [nome, num] of Object.entries(MESES_MAP)) {
    const regex = new RegExp(`\\b${nome}\\b`, 'gi')
    if (regex.test(textoLower)) {
      return { mes: formatarMes(num, anoAtual), match: nome }
    }
  }

  return null
}

/**
 * Extrai mês global do contexto
 * Detecta frases como:
 * - "tudo de janeiro", "tudo para julho 2025"
 * - "mês de fevereiro", "mês: março"
 * - "referente a janeiro", "ref julho"
 * - "julho 2025" (no início ou final do texto)
 * - "janeiro", "julho" (quando claramente indica contexto global)
 *
 * Retorna o mês que deve ser aplicado a todos os lançamentos
 */
export function extrairMesGlobal(texto: string): ExtraidoMes | null {
  const anoAtual = getAnoAtual()
  const mesAtualNum = new Date().getMonth() + 1

  // Lista de meses para regex (incluindo abreviações)
  const mesesRegex = 'janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez'

  // Padrões ordenados por prioridade (mais específicos primeiro)
  const padroesMesGlobal = [
    // "tudo de/para/pra NOME_MES [de] [ANO]"
    new RegExp(`\\b(?:tudo|todos?)\\s+(?:de|para|pra)\\s+(${mesesRegex})(?:\\s+(?:de\\s+)?(\\d{2,4}))?\\b`, 'gi'),

    // "mês de NOME_MES [ANO]" ou "mês: NOME_MES" ou "mês NOME_MES"
    new RegExp(`\\b(?:mês|mes)[:\\s]+(?:de\\s+)?(${mesesRegex})(?:\\s+(?:de\\s+)?(\\d{2,4}))?\\b`, 'gi'),

    // "referente a NOME_MES [ANO]" ou "ref NOME_MES"
    new RegExp(`\\b(?:referente|ref\\.?)\\s+(?:a\\s+)?(${mesesRegex})(?:\\s+(?:de\\s+)?(\\d{2,4}))?\\b`, 'gi'),

    // "NOME_MES [de] ANO" no final do texto com qualquer whitespace (tabs, newlines, espaços)
    new RegExp(`(${mesesRegex})(?:\\s+de)?\\s+(\\d{4})[\\s\\n\\r\\t]*$`, 'gi'),

    // "NOME_MES ANO" ou "NOME_MES/ANO" em qualquer posição com ano de 4 dígitos (alta prioridade)
    new RegExp(`\\b(${mesesRegex})\\s+(?:de\\s+)?(\\d{4})\\b`, 'gi'),

    // "NOME_MES/ANO" formato com barra
    new RegExp(`\\b(${mesesRegex})\\/(\\d{4})\\b`, 'gi'),

    // "NOME_MES [de] 25" (ano com 2 dígitos) no final com qualquer whitespace
    new RegExp(`(${mesesRegex})(?:\\s+de)?\\s+(\\d{2})[\\s\\n\\r\\t]*$`, 'gi'),

    // "para/pra NOME_MES [ANO]" (em qualquer posição, não só início)
    new RegExp(`\\b(?:para|pra)\\s+(${mesesRegex})(?:\\s+(?:de\\s+)?(\\d{2,4}))?\\b`, 'gi'),

    // "de NOME_MES [ANO]" no início do texto
    new RegExp(`^\\s*(?:de\\s+)?(${mesesRegex})(?:\\s+(?:de\\s+)?(\\d{2,4}))?[:\\s]`, 'gi'),

    // "MM/YYYY" ou "MM-YYYY" com prefixo indicando contexto global
    /\b(?:tudo|todos?|mês|mes|referente|ref\.?)\s+(?:de\s+|a\s+)?(\d{1,2})[\/\-](\d{2,4})\b/gi,

    // "NOME_MES" sozinho no início ou final do texto (menos prioritário)
    new RegExp(`^\\s*(${mesesRegex})\\s*[:\\-]`, 'gi'),
    new RegExp(`[:\\-]\\s*(${mesesRegex})\\s*$`, 'gi'),
  ]

  for (const regex of padroesMesGlobal) {
    regex.lastIndex = 0
    const match = regex.exec(texto)
    if (match) {
      // Verifica se é formato numérico (MM/YYYY)
      if (/^\d+$/.test(match[1])) {
        const mesNum = parseInt(match[1])
        let ano = parseInt(match[2])
        if (ano < 100) ano += 2000
        if (mesNum >= 1 && mesNum <= 12) {
          return { mes: formatarMes(mesNum, ano), match: match[0] }
        }
      } else {
        // É nome de mês
        const mesNome = match[1].toLowerCase()
        const mesNum = MESES_MAP[mesNome]
        if (mesNum) {
          let ano = anoAtual
          if (match[2]) {
            ano = parseInt(match[2])
            if (ano < 100) ano += 2000
          } else {
            // Se mês já passou neste ano, assume próximo ano
            if (mesNum < mesAtualNum) {
              ano = anoAtual + 1
            }
          }
          return { mes: formatarMes(mesNum, ano), match: match[0] }
        }
      }
    }
  }

  return null
}

/**
 * Extrai período de recorrência
 */
function extrairPeriodoRobusto(texto: string): ExtraidoPeriodo | null {
  const mesAtual = getMesAtual()

  // "por X meses" ou "próximos X meses"
  const regexPorMeses = /\b(por|próximos?|proximos?)\s+(\d+)\s+mes(es)?\b/gi
  let match = regexPorMeses.exec(texto)
  if (match) {
    const quantidade = Math.min(parseInt(match[2]), 60) // Máximo 5 anos
    return {
      meses: gerarMesesAPartirDe(mesAtual, quantidade),
      match: match[0]
    }
  }

  // "X parcelas" ou "em X vezes"
  const regexParcelas = /\b(\d+)\s*(parcelas?|vezes|x)\b/gi
  match = regexParcelas.exec(texto)
  if (match) {
    const quantidade = Math.min(parseInt(match[1]), 60)
    if (quantidade > 1) {
      return {
        meses: gerarMesesAPartirDe(mesAtual, quantidade),
        match: match[0]
      }
    }
  }

  // "mes1 até mes2" ou "mes1 a mes2"
  const regexAte = /\b(de\s+)?(\w+)[\/\s]*(\d{2,4})?\s*(até|a|ate)\s*(\w+)[\/\s]*(\d{2,4})?\b/gi
  match = regexAte.exec(texto)
  if (match) {
    const mesInicio = parseMesString(match[2], match[3] || String(getAnoAtual()))
    const mesFim = parseMesString(match[5], match[6] || String(getAnoAtual()))
    if (mesInicio && mesFim) {
      return {
        meses: gerarMesesEntre(mesInicio, mesFim),
        match: match[0]
      }
    }
  }

  return null
}

function parseMesString(mesStr: string, anoStr: string): string | null {
  let mesNum: number

  const mesNumerico = parseInt(mesStr)
  if (!isNaN(mesNumerico) && mesNumerico >= 1 && mesNumerico <= 12) {
    mesNum = mesNumerico
  } else {
    mesNum = MESES_MAP[mesStr.toLowerCase()]
    if (!mesNum) return null
  }

  let ano = parseInt(anoStr)
  if (isNaN(ano)) return null
  if (ano < 100) ano += 2000

  return formatarMes(mesNum, ano)
}

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

function gerarMesesEntre(mesInicio: string, mesFim: string): string[] {
  const meses: string[] = []
  const [anoInicio, mesInicioNum] = mesInicio.split('-').map(Number)
  let [anoFim, mesFimNum] = mesFim.split('-').map(Number)

  // Se mês fim < mês início e mesmo ano, assume próximo ano
  if (mesFimNum < mesInicioNum && anoFim === anoInicio) {
    anoFim++
  }

  let ano = anoInicio
  let mes = mesInicioNum

  while (ano < anoFim || (ano === anoFim && mes <= mesFimNum)) {
    meses.push(formatarMes(mes, ano))
    mes++
    if (mes > 12) {
      mes = 1
      ano++
    }
    if (meses.length > 120) break // Proteção
  }

  return meses
}

// ============================================================================
// DETECÇÃO DE TIPO
// ============================================================================

/**
 * Detecta tipo do lançamento com análise de contexto
 */
function detectarTipoRobusto(texto: string, valorNegativo?: boolean): TipoLancamento {
  const textoLower = texto.toLowerCase()

  // Se valor é negativo, é saída
  if (valorNegativo) return 'saida'

  // Verifica indicadores explícitos de crédito/débito
  // Escapa caracteres especiais de regex (como + e -)
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  for (const indicador of INDICADORES_CREDITO) {
    const regex = new RegExp(`\\b${escapeRegex(indicador)}\\b`, 'i')
    if (regex.test(textoLower)) return 'entrada'
  }

  for (const indicador of INDICADORES_DEBITO) {
    const regex = new RegExp(`\\b${escapeRegex(indicador)}\\b`, 'i')
    if (regex.test(textoLower)) return 'saida'
  }

  // Score baseado em palavras-chave
  let scoreEntrada = 0
  let scoreSaida = 0

  for (const palavra of PALAVRAS_ENTRADA) {
    if (textoLower.includes(palavra.toLowerCase())) {
      scoreEntrada++
    }
  }

  for (const palavra of PALAVRAS_SAIDA) {
    if (textoLower.includes(palavra.toLowerCase())) {
      scoreSaida++
    }
  }

  if (scoreEntrada > scoreSaida) return 'entrada'
  if (scoreSaida > scoreEntrada) return 'saida'

  // Default: saída (mais comum no dia a dia)
  return 'saida'
}

// ============================================================================
// LIMPEZA DE NOME
// ============================================================================

const PALAVRAS_REMOVER = [
  'de', 'do', 'da', 'dos', 'das',
  'no', 'na', 'nos', 'nas',
  'para', 'pra', 'pro',
  'com', 'em', 'ao', 'à',
  'o', 'a', 'os', 'as',
  'um', 'uma', 'uns', 'umas',
  'e', 'ou', 'que',
  'reais', 'real', 'r$'
]

/**
 * Limpa e normaliza nome do lançamento
 */
function limparNome(texto: string): string {
  let nome = texto.trim()

  // Remove múltiplos espaços
  nome = nome.replace(/\s+/g, ' ')

  // Remove palavras auxiliares do início
  for (const palavra of PALAVRAS_REMOVER) {
    const regex = new RegExp(`^${palavra}\\s+`, 'i')
    nome = nome.replace(regex, '')
  }

  // Remove palavras auxiliares do fim
  for (const palavra of PALAVRAS_REMOVER) {
    const regex = new RegExp(`\\s+${palavra}$`, 'i')
    nome = nome.replace(regex, '')
  }

  // NOTA: NÃO removemos mais palavras-chave de tipo do nome
  // Motivo: Causa bugs como "Mercado Pago" → "Pago" porque "mercado" está em PALAVRAS_SAIDA
  // As palavras são usadas apenas para detectar o tipo, não para limpar o nome

  // Limpa novamente
  nome = nome.replace(/\s+/g, ' ').trim()

  // Capitaliza primeira letra
  if (nome.length > 0) {
    nome = nome.charAt(0).toUpperCase() + nome.slice(1)
  }

  return nome
}

// ============================================================================
// PARSERS POR FORMATO
// ============================================================================

/**
 * Parser para dados TSV (colados de Excel/Google Sheets)
 */
function parseTSV(input: string, mesDefault: string): ParsedLancamento[] {
  const linhas = input.split('\n').filter(l => l.trim())
  const lancamentos: ParsedLancamento[] = []

  for (const linha of linhas) {
    const colunas = linha.split('\t').map(c => c.trim())
    if (colunas.length < 2) continue

    // Pula header se detectado
    if (isHeaderLinha(colunas.join(' '))) continue

    const item = extrairDeColunas(colunas, mesDefault, linha)
    if (item) lancamentos.push(item)
  }

  return lancamentos
}

/**
 * Parser para dados CSV
 */
function parseCSV(input: string, mesDefault: string): ParsedLancamento[] {
  // Detecta separador
  const primeiraLinha = input.split('\n')[0]
  const separador = primeiraLinha.split(';').length > primeiraLinha.split(',').length ? ';' : ','

  const linhas = input.split('\n').filter(l => l.trim())
  const lancamentos: ParsedLancamento[] = []

  for (const linha of linhas) {
    const colunas = linha.split(separador).map(c => c.trim())
    if (colunas.length < 2) continue

    // Pula header
    if (isHeaderLinha(colunas.join(' '))) continue

    const item = extrairDeColunas(colunas, mesDefault, linha)
    if (item) lancamentos.push(item)
  }

  return lancamentos
}

/**
 * Parser para extrato bancário
 */
function parseExtrato(input: string, mesDefault: string): ParsedLancamento[] {
  const linhas = input.split('\n').filter(l => l.trim())
  const lancamentos: ParsedLancamento[] = []

  for (const linha of linhas) {
    // Pula header
    if (isHeaderLinha(linha)) continue

    const item = parseLinhaExtrato(linha, mesDefault)
    if (item) lancamentos.push(item)
  }

  return lancamentos
}

/**
 * Parser para texto livre
 */
function parseTextoLivre(input: string, mesDefault: string): ParsedLancamento[] {
  const linhas = input.split('\n').filter(l => l.trim())
  const lancamentos: ParsedLancamento[] = []

  for (const linha of linhas) {
    const items = parseLinha(linha, mesDefault)
    lancamentos.push(...items)
  }

  return lancamentos
}

// ============================================================================
// FUNÇÕES AUXILIARES DE PARSING
// ============================================================================

/**
 * Detecta se uma linha é header
 */
function isHeaderLinha(linha: string): boolean {
  const lower = linha.toLowerCase()
  const palavrasHeader = [
    'data', 'descrição', 'descricao', 'valor', 'tipo',
    'historico', 'histórico', 'lançamento', 'lancamento',
    'categoria', 'date', 'description', 'amount', 'type'
  ]

  let matches = 0
  for (const palavra of palavrasHeader) {
    if (lower.includes(palavra)) matches++
  }

  return matches >= 2
}

/**
 * Extrai lançamento de colunas (TSV/CSV)
 */
function extrairDeColunas(colunas: string[], mesDefault: string, textoOriginal: string): ParsedLancamento | null {
  let data: ExtraidaData | null = null
  let valor: number | null = null
  let tipo: TipoLancamento | null = null
  let nome = ''
  let valorNegativo = false

  for (const col of colunas) {
    const limpo = col.trim()
    if (!limpo) continue

    // Tenta como data
    if (!data) {
      const dataExtraida = extrairDataRobusta(limpo)
      if (dataExtraida) {
        data = dataExtraida
        continue
      }
    }

    // Tenta como valor
    if (valor === null) {
      // Verifica se é negativo
      const negativo = limpo.startsWith('-') || limpo.startsWith('(')
      const valorExtraido = extrairValorRobusto(limpo.replace(/[()]/g, ''))
      if (valorExtraido) {
        valor = valorExtraido.valor
        valorNegativo = negativo
        continue
      }
    }

    // Tenta como tipo
    if (!tipo) {
      const lowerCol = limpo.toLowerCase()
      if (INDICADORES_CREDITO.some(i => lowerCol === i)) {
        tipo = 'entrada'
        continue
      }
      if (INDICADORES_DEBITO.some(i => lowerCol === i)) {
        tipo = 'saida'
        continue
      }
    }

    // Resto é nome (se ainda não tem e não é apenas número)
    if (!nome && limpo.length > 0 && !/^\d+$/.test(limpo)) {
      nome = limpo
    }
  }

  // Se não tem valor, não é válido
  if (valor === null) return null

  // Determina tipo se não veio explícito
  if (!tipo) {
    tipo = valorNegativo ? 'saida' : detectarTipoRobusto(nome)
  }

  // Limpa nome
  nome = limparNome(nome)

  // Valida e cria resultado
  const { status, camposFaltantes, avisos, erros } = validarItem({ nome, valor, tipo })

  return {
    id: generateId(),
    tipo,
    nome: nome || 'Sem descrição',
    valor,
    mes: data?.mes || mesDefault,
    diaPrevisto: data?.dia || null,
    status,
    camposFaltantes,
    groupId: generateId(),
    avisos,
    erros,
    textoOriginal
  }
}

/**
 * Parseia linha de extrato bancário
 */
function parseLinhaExtrato(linha: string, mesDefault: string): ParsedLancamento | null {
  // Padrão típico: "15/01 DESCRIÇÃO 150,00" ou "15/01/2025 TED RECEBIDA 5.000,00 C"

  // Extrai data do início
  const data = extrairDataRobusta(linha)
  let textoRestante = data ? linha.replace(data.match, '').trim() : linha

  // Extrai valor (geralmente no final)
  const valor = extrairValorRobusto(textoRestante)
  if (!valor) return null

  textoRestante = textoRestante.replace(valor.match, '').trim()

  // Verifica indicador de tipo no final
  const matchTipo = textoRestante.match(/\s+([CD]|CR|DB)$/i)
  let tipo: TipoLancamento

  if (matchTipo) {
    tipo = ['c', 'cr'].includes(matchTipo[1].toLowerCase()) ? 'entrada' : 'saida'
    textoRestante = textoRestante.replace(matchTipo[0], '').trim()
  } else {
    // Detecta por palavras ou assume saída
    tipo = detectarTipoRobusto(textoRestante)
  }

  // O que sobra é o nome
  const nome = limparNome(textoRestante)

  const { status, camposFaltantes, avisos, erros } = validarItem({ nome, valor: valor.valor, tipo })

  return {
    id: generateId(),
    tipo,
    nome: nome || 'Sem descrição',
    valor: valor.valor,
    mes: data?.mes || mesDefault,
    diaPrevisto: data?.dia || null,
    status,
    camposFaltantes,
    groupId: generateId(),
    avisos,
    erros,
    textoOriginal: linha
  }
}

/**
 * Parseia uma linha de texto livre
 */
function parseLinha(texto: string, mesDefault: string): ParsedLancamento[] {
  if (!texto.trim()) return []

  const lancamentos: ParsedLancamento[] = []
  let textoRestante = texto

  // Detecta tipo primeiro (antes de modificar)
  const tipo = detectarTipoRobusto(texto)

  // Extrai valor
  const valorExtraido = extrairValorRobusto(texto)
  // Usa ?? em vez de || para permitir valor 0 (para grupos modo soma)
  const valor = valorExtraido?.valor ?? null
  if (valorExtraido) {
    textoRestante = textoRestante.replace(valorExtraido.match, ' ')
  }

  // Extrai data/dia
  const dataExtraida = extrairDataRobusta(textoRestante)
  const diaPrevisto = dataExtraida?.dia || null
  if (dataExtraida) {
    textoRestante = textoRestante.replace(dataExtraida.match, ' ')
  }

  // Extrai período (recorrência)
  const periodoExtraido = extrairPeriodoRobusto(textoRestante)
  if (periodoExtraido) {
    textoRestante = textoRestante.replace(periodoExtraido.match, ' ')
  }

  // Extrai mês único
  const mesExtraido = extrairMesRobusto(textoRestante)
  if (mesExtraido) {
    textoRestante = textoRestante.replace(mesExtraido.match, ' ')
  }

  // Limpa nome
  const nome = limparNome(textoRestante)

  // Valida
  const { status, camposFaltantes, avisos, erros } = validarItem({ nome, valor, tipo })

  // Gera ID de grupo
  const groupId = generateId()

  // Se tem recorrência, cria múltiplos
  if (periodoExtraido && periodoExtraido.meses.length > 1) {
    for (const mes of periodoExtraido.meses) {
      lancamentos.push({
        id: generateId(),
        tipo,
        nome: nome || '',
        valor,
        mes,
        diaPrevisto,
        status,
        camposFaltantes,
        groupId,
        avisos,
        erros,
        textoOriginal: texto
      })
    }
  } else {
    // Lançamento único
    const mes = mesExtraido?.mes || dataExtraida?.mes || mesDefault
    lancamentos.push({
      id: generateId(),
      tipo,
      nome: nome || '',
      valor,
      mes,
      diaPrevisto,
      status,
      camposFaltantes,
      groupId,
      avisos,
      erros,
      textoOriginal: texto
    })
  }

  return lancamentos
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

interface ValidacaoResult {
  status: StatusItem
  camposFaltantes: ('valor' | 'nome')[]
  avisos: string[]
  erros: string[]
}

/**
 * Valida item e determina status
 */
function validarItem(item: { nome?: string; valor: number | null; tipo?: TipoLancamento; isAgrupador?: boolean }): ValidacaoResult {
  const erros: string[] = []
  const avisos: string[] = []
  const camposFaltantes: ('valor' | 'nome')[] = []

  // Campos obrigatórios
  // Valor 0 é permitido para grupos modo soma
  if (item.valor === null || (item.valor < 0) || (item.valor === 0 && !item.isAgrupador)) {
    // Só marca como faltante se for null ou negativo
    // Valor 0 sem ser agrupador gera aviso, não erro
    if (item.valor === null || item.valor < 0) {
      erros.push('Valor não identificado')
      camposFaltantes.push('valor')
    }
  }

  if (!item.nome || item.nome.length < 2) {
    erros.push('Descrição não identificada')
    camposFaltantes.push('nome')
  }

  // Avisos (não bloqueiam)
  if (item.valor !== null && (item.valor < 1 || item.valor > 1000000)) {
    avisos.push('Valor parece incomum')
  }

  let status: StatusItem
  if (erros.length > 0) {
    status = 'incompleto'
  } else if (avisos.length > 0) {
    status = 'atencao'
  } else {
    status = 'completo'
  }

  return { status, camposFaltantes, avisos, erros }
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Função principal do parser
 * Detecta automaticamente o formato e processa a entrada
 */
export function parseInput(texto: string, mesDefault?: string): ParseResult {
  const mesAtual = mesDefault || getMesAtual()
  const textoLimpo = texto.trim()

  if (!textoLimpo) {
    return {
      lancamentos: [],
      textoOriginal: texto,
      formatoDetectado: 'texto-livre',
      resumo: {
        total: 0,
        completos: 0,
        atencao: 0,
        incompletos: 0,
        totalEntradas: 0,
        totalSaidas: 0
      }
    }
  }

  // Primeiro, verifica se há um mês global especificado no texto
  // Ex: "tudo de janeiro", "mês de fevereiro", etc
  const mesGlobal = extrairMesGlobal(textoLimpo)
  const mesParaUsar = mesGlobal?.mes || mesAtual

  // Detecta formato automaticamente
  const formato = detectarFormato(textoLimpo)

  // Usa parser apropriado
  let lancamentos: ParsedLancamento[]
  switch (formato) {
    case 'tsv':
      lancamentos = parseTSV(textoLimpo, mesParaUsar)
      break
    case 'csv':
      lancamentos = parseCSV(textoLimpo, mesParaUsar)
      break
    case 'extrato':
      lancamentos = parseExtrato(textoLimpo, mesParaUsar)
      break
    default:
      lancamentos = parseTextoLivre(textoLimpo, mesParaUsar)
  }

  // Se um mês global foi especificado, aplica a todos os lançamentos
  // que não têm data específica extraída
  if (mesGlobal) {
    lancamentos = lancamentos.map(l => {
      // Se o lançamento tem a mesma data que o default, atualiza para o mês global
      // Isso permite que datas específicas extraídas de cada linha sejam mantidas
      if (l.mes === mesAtual || l.mes === mesParaUsar) {
        return { ...l, mes: mesGlobal.mes }
      }
      return l
    })
  }

  // Calcula resumo
  const completos = lancamentos.filter(l => l.status === 'completo').length
  const atencao = lancamentos.filter(l => l.status === 'atencao').length
  const incompletos = lancamentos.filter(l => l.status === 'incompleto').length

  const totalEntradas = lancamentos
    .filter(l => l.tipo === 'entrada' && l.valor !== null)
    .reduce((sum, l) => sum + (l.valor || 0), 0)

  const totalSaidas = lancamentos
    .filter(l => l.tipo === 'saida' && l.valor !== null)
    .reduce((sum, l) => sum + (l.valor || 0), 0)

  return {
    lancamentos,
    textoOriginal: texto,
    formatoDetectado: formato,
    mesExtraido: mesGlobal?.mes,
    resumo: {
      total: lancamentos.length,
      completos,
      atencao,
      incompletos,
      totalEntradas,
      totalSaidas
    }
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES EXPORTADAS
// ============================================================================

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
 * Agrupa lançamentos por groupId para mostrar recorrências
 */
export function agruparRecorrencias(lancamentos: ParsedLancamento[]): Map<string, ParsedLancamento[]> {
  const grupos = new Map<string, ParsedLancamento[]>()

  for (const lancamento of lancamentos) {
    const grupo = grupos.get(lancamento.groupId) || []
    grupo.push(lancamento)
    grupos.set(lancamento.groupId, grupo)
  }

  // Ordena cada grupo por mês
  for (const items of grupos.values()) {
    items.sort((a, b) => a.mes.localeCompare(b.mes))
  }

  return grupos
}

/**
 * Gera lista de meses para seleção
 * Retorna os últimos 3 meses e os próximos 12
 */
export function gerarListaMeses(): Array<{ value: string; label: string }> {
  const meses: Array<{ value: string; label: string }> = []
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // 3 meses anteriores + mês atual + 12 próximos
  for (let i = -3; i <= 12; i++) {
    let month = currentMonth + i
    let year = currentYear

    while (month < 0) {
      month += 12
      year--
    }
    while (month > 11) {
      month -= 12
      year++
    }

    const value = `${year}-${String(month + 1).padStart(2, '0')}`
    const label = new Date(year, month, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    })

    meses.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }

  return meses
}
