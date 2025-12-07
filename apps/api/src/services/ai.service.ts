/**
 * AI Service
 *
 * Serviço de integração com Google Gemini para interpretação
 * de lançamentos financeiros a partir de texto livre.
 */

import { GoogleGenAI } from '@google/genai'

interface ParsedLancamento {
  tipo: 'entrada' | 'saida'
  nome: string
  valor: number
  diaPrevisto: number | null
  categoriaId: string | null // ID da categoria padrão
}

interface ParseResult {
  lancamentos: ParsedLancamento[]
  erro?: string
}

// Limite máximo de lançamentos por requisição (segurança)
const MAX_LANCAMENTOS_POR_REQUEST = 20

// IDs das categorias padrão do sistema
const CATEGORIAS = {
  // Entradas
  SALARIO: 'default-salario',
  INVESTIMENTOS: 'default-investimentos',
  OUTROS_ENTRADA: 'default-outros-entrada',
  // Saídas
  MORADIA: 'default-moradia',
  ALIMENTACAO: 'default-alimentacao',
  TRANSPORTE: 'default-transporte',
  SAUDE: 'default-saude',
  LAZER: 'default-lazer',
  CARTAO: 'default-cartao',
  OUTROS_SAIDA: 'default-outros-saida',
}

// Lista de todas as categorias válidas para validação
const CATEGORIAS_VALIDAS = Object.values(CATEGORIAS)

// Keywords para categorização automática (fallback)
const KEYWORDS_CATEGORIAS: Record<string, string[]> = {
  // Entradas
  [CATEGORIAS.SALARIO]: [
    'salário', 'salario', 'sal', 'holerite', 'clt', '13º', 'décimo terceiro',
    'décimo', 'ferias', 'férias', 'pagamento trabalho', 'folha'
  ],
  [CATEGORIAS.INVESTIMENTOS]: [
    'dividendo', 'dividendos', 'rendimento', 'rendimentos', 'juros', 'juro',
    'resgate', 'ações', 'acoes', 'fii', 'fiis', 'cdb', 'poupança', 'poupanca',
    'tesouro', 'lci', 'lca', 'debenture', 'investimento'
  ],
  // Saídas
  [CATEGORIAS.MORADIA]: [
    'aluguel', 'condomínio', 'condominio', 'iptu', 'luz', 'energia', 'elétrica',
    'água', 'agua', 'gás', 'gas', 'internet', 'wifi', 'manutenção casa',
    'conserto casa', 'móveis', 'moveis', 'eletrodoméstico', 'eletrodomestico',
    'geladeira', 'fogão', 'microondas', 'máquina lavar', 'tv', 'televisão'
  ],
  [CATEGORIAS.ALIMENTACAO]: [
    'mercado', 'supermercado', 'feira', 'açougue', 'acougue', 'padaria',
    'restaurante', 'ifood', 'rappi', 'delivery', 'lanche', 'café', 'cafe',
    'almoço', 'almoco', 'jantar', 'comida', 'pizza', 'hamburguer', 'sushi',
    'mcdonald', 'burger', 'subway', 'starbucks', 'hortifruti'
  ],
  [CATEGORIAS.TRANSPORTE]: [
    'combustível', 'combustivel', 'gasolina', 'álcool', 'alcool', 'etanol',
    'uber', '99', 'táxi', 'taxi', 'ônibus', 'onibus', 'metrô', 'metro',
    'estacionamento', 'pedágio', 'pedagio', 'ipva', 'seguro auto', 'seguro carro',
    'manutenção carro', 'oficina', 'mecânico', 'mecanico', 'parcela carro',
    'parcela moto', 'moto', 'sem parar', 'conectcar', 'veloe'
  ],
  [CATEGORIAS.SAUDE]: [
    'farmácia', 'farmacia', 'remédio', 'remedio', 'medicamento', 'médico',
    'medico', 'consulta', 'exame', 'plano de saúde', 'plano saude', 'unimed',
    'bradesco saúde', 'sulamerica', 'dentista', 'odonto', 'psicólogo',
    'psicologo', 'academia', 'smartfit', 'suplemento', 'whey', 'vitamina',
    'hospital', 'clínica', 'clinica', 'fisioterapia', 'drogaria', 'droga raia',
    'drogasil', 'pague menos'
  ],
  [CATEGORIAS.LAZER]: [
    'netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'prime video',
    'youtube premium', 'twitch', 'deezer', 'apple music', 'xbox', 'playstation',
    'steam', 'jogos', 'game', 'cinema', 'teatro', 'show', 'viagem', 'hotel',
    'airbnb', 'bar', 'festa', 'hobby', 'streaming', 'globoplay', 'paramount',
    'crunchyroll', 'max', 'apple tv'
  ],
  [CATEGORIAS.CARTAO]: [
    // Bancos e fintechs (cartões)
    'nubank', 'nu bank', 'roxinho', 'cartão nubank', 'fatura nubank',
    'c6', 'c6 bank', 'cartão c6', 'fatura c6',
    'inter', 'banco inter', 'cartão inter', 'fatura inter',
    'itaú', 'itau', 'cartão itaú', 'fatura itaú', 'cartao itau', 'fatura itau',
    'bradesco', 'cartão bradesco', 'fatura bradesco',
    'santander', 'cartão santander', 'fatura santander',
    'bb', 'banco do brasil', 'cartão bb', 'fatura bb',
    'caixa', 'cartão caixa', 'fatura caixa',
    'original', 'banco original', 'cartão original',
    'next', 'cartão next', 'fatura next',
    'picpay', 'pic pay', 'cartão picpay',
    'mercado pago', 'cartão mercado pago',
    'will bank', 'willbank', 'will',
    'neon', 'cartão neon', 'fatura neon',
    'pagbank', 'pagseguro', 'cartão pagbank',
    'btg', 'btg pactual', 'cartão btg',
    'xp', 'cartão xp',
    'modal', 'banco modal',
    'sofisa', 'banco sofisa',
    'pan', 'banco pan', 'cartão pan',
    'bv', 'banco bv', 'cartão bv',
    'digio', 'cartão digio',
    'credicard', 'cartão credicard',
    'ourocard', 'cartão ourocard',
    'elo', 'cartão elo',
    'mastercard', 'master card', 'master',
    'visa',
    'amex', 'american express',
    'hipercard', 'hiper',
    // Termos genéricos de cartão
    'cartão de crédito', 'cartao de credito', 'cartão crédito', 'cartao credito',
    'fatura cartão', 'fatura cartao', 'fatura do cartão', 'fatura do cartao',
    'cartão', 'cartao', 'fatura', 'parcela cartão', 'parcela cartao',
    'anuidade', 'anuidade cartão',
  ],
}

/**
 * Categoriza um lançamento baseado em keywords
 * Usado como fallback quando IA não categoriza ou para validação
 */
function categorizarPorKeywords(nome: string, tipo: 'entrada' | 'saida'): string {
  const nomeL = nome.toLowerCase()

  // Busca em todas as categorias
  for (const [categoriaId, keywords] of Object.entries(KEYWORDS_CATEGORIAS)) {
    // Verifica se a categoria é compatível com o tipo
    const isEntrada = tipo === 'entrada'
    const isCategoriaEntrada = categoriaId.includes('salario') ||
                               categoriaId.includes('investimentos') ||
                               categoriaId.includes('outros-entrada')

    // Pula categorias incompatíveis com o tipo
    if (isEntrada !== isCategoriaEntrada) continue

    // Verifica se alguma keyword está presente no nome
    for (const keyword of keywords) {
      if (nomeL.includes(keyword)) {
        return categoriaId
      }
    }
  }

  // Fallback: categoria "Outros" do tipo correspondente
  return tipo === 'entrada' ? CATEGORIAS.OUTROS_ENTRADA : CATEGORIAS.OUTROS_SAIDA
}

/**
 * Valida se uma categoriaId é válida e compatível com o tipo
 */
function validarCategoria(categoriaId: string | null | undefined, tipo: 'entrada' | 'saida'): string | null {
  // Se não tem categoria, retorna null (será categorizado depois)
  if (!categoriaId) return null

  // Verifica se é uma categoria válida
  if (!CATEGORIAS_VALIDAS.includes(categoriaId)) return null

  // Verifica compatibilidade de tipo
  const isEntrada = tipo === 'entrada'
  const isCategoriaEntrada = categoriaId.includes('salario') ||
                             categoriaId.includes('investimentos') ||
                             categoriaId.includes('outros-entrada')

  // Se tipo não bate, retorna null
  if (isEntrada !== isCategoriaEntrada) return null

  return categoriaId
}

/**
 * Verifica se o texto menciona cartão de crédito ou banco
 * Usado para priorizar a categoria de cartão
 */
function isCartaoCredito(texto: string): boolean {
  const textoL = texto.toLowerCase()
  const keywordsCartao = KEYWORDS_CATEGORIAS[CATEGORIAS.CARTAO]
  return keywordsCartao.some(keyword => textoL.includes(keyword))
}

const SYSTEM_PROMPT = `Você é um assistente de finanças pessoais especializado em classificar transações financeiras.

## SUA TAREFA
Extrair lançamentos financeiros do texto do usuário, identificando:
1. **tipo**: "entrada" (dinheiro ENTRANDO) ou "saida" (dinheiro SAINDO)
2. **nome**: descrição clara do que é o lançamento
3. **valor**: valor numérico
4. **diaPrevisto**: dia do mês se mencionado (1-31 ou null)
5. **categoriaId**: categoria do lançamento (use EXATAMENTE um dos IDs abaixo)

## CATEGORIAS DISPONÍVEIS

### Para ENTRADAS (tipo="entrada"):
- "default-salario" → Salário, CLT, holerite, pagamento de trabalho fixo, 13º, férias
- "default-investimentos" → Dividendos, rendimentos, juros, resgate de investimento, ações, FIIs, CDB, poupança
- "default-outros-entrada" → Freelance, bico, venda, reembolso, presente, prêmio, rifa, cashback, qualquer outra entrada

### Para SAÍDAS (tipo="saida"):
- "default-moradia" → Aluguel, condomínio, IPTU, luz, água, gás, internet, manutenção casa, móveis, eletrodomésticos
- "default-alimentacao" → Mercado, supermercado, feira, açougue, padaria, restaurante, iFood, delivery, lanche, café
- "default-transporte" → Combustível, gasolina, álcool, Uber, 99, táxi, ônibus, metrô, estacionamento, pedágio, manutenção carro, IPVA, seguro auto, parcela carro/moto
- "default-saude" → Farmácia, remédio, médico, consulta, exame, plano de saúde, dentista, psicólogo, academia, suplemento
- "default-lazer" → Netflix, Spotify, Disney+, HBO, Amazon Prime, jogos, cinema, teatro, viagem, hotel, bar, festa, hobby, streaming
- "default-cartao" → QUALQUER menção a banco, cartão ou fatura: Nubank, C6, Inter, Itaú, Bradesco, Santander, fatura, cartão de crédito, anuidade
- "default-outros-saida" → Roupas, calçados, eletrônicos, celular, presentes, educação, cursos, escola, faculdade, qualquer outra saída que NÃO seja cartão

## REGRA DE CATEGORIZAÇÃO
- SEMPRE escolha a categoria mais específica possível
- **IMPORTANTE**: Se mencionar nome de banco (Nubank, C6, Inter, Itaú, etc.) ou "cartão", "fatura" → use "default-cartao"
- Se não souber, use "default-outros-entrada" ou "default-outros-saida"
- Parcelas sem contexto → "default-outros-saida"

## REGRA FUNDAMENTAL DE TIPO

### ENTRADA = Dinheiro ENTRANDO no bolso
- Verbos: ganhei, recebi, vendi, lucrei, faturei, entrou
- Contextos: salário, freelance, venda, comissão, bônus, dividendos

### SAÍDA = Dinheiro SAINDO do bolso
- Verbos: paguei, gastei, comprei, perdi
- Contextos: contas, parcelas, compras, assinaturas, aluguel

## VALORES
- Valores podem vir em formato brasileiro: R$ 3.817,55 (ponto = milhar, vírgula = decimal)
- Abreviados: "5k" = 5000, "1.5k" = 1500, "mil" = 1000
- Retorne o valor como número decimal (ex: 3817.55)

## NOME DO LANÇAMENTO
- Extraia O QUE é, não a ação: "gastei 50 em pizza" → nome: "Pizza"
- Primeira letra maiúscula

## EXEMPLOS

- "salário 5000" → tipo: "entrada", categoriaId: "default-salario", nome: "Salário"
- "freela 1200" → tipo: "entrada", categoriaId: "default-outros-entrada", nome: "Freelance"
- "dividendos 150" → tipo: "entrada", categoriaId: "default-investimentos", nome: "Dividendos"
- "aluguel 2400" → tipo: "saida", categoriaId: "default-moradia", nome: "Aluguel"
- "luz 150" → tipo: "saida", categoriaId: "default-moradia", nome: "Luz"
- "mercado 500" → tipo: "saida", categoriaId: "default-alimentacao", nome: "Mercado"
- "ifood 80" → tipo: "saida", categoriaId: "default-alimentacao", nome: "iFood"
- "uber 45" → tipo: "saida", categoriaId: "default-transporte", nome: "Uber"
- "gasolina 200" → tipo: "saida", categoriaId: "default-transporte", nome: "Gasolina"
- "farmácia 120" → tipo: "saida", categoriaId: "default-saude", nome: "Farmácia"
- "netflix 55" → tipo: "saida", categoriaId: "default-lazer", nome: "Netflix"
- "nubank 3000" → tipo: "saida", categoriaId: "default-cartao", nome: "Nubank"
- "fatura c6 2500" → tipo: "saida", categoriaId: "default-cartao", nome: "Fatura C6"
- "cartão itaú 1800" → tipo: "saida", categoriaId: "default-cartao", nome: "Cartão Itaú"
- "inter 500" → tipo: "saida", categoriaId: "default-cartao", nome: "Inter"
- "parcela carro 800" → tipo: "saida", categoriaId: "default-transporte", nome: "Parcela carro"

## FORMATO DE RESPOSTA
Retorne APENAS JSON válido, sem markdown:
{"lancamentos":[{"tipo":"entrada","nome":"Salário","valor":5000,"diaPrevisto":5,"categoriaId":"default-salario"}]}

Máximo ${MAX_LANCAMENTOS_POR_REQUEST} lançamentos por requisição.`

/**
 * Pós-processamento MÍNIMO de segurança
 *
 * A IA é responsável pela classificação principal.
 * Este código apenas corrige casos ÓBVIOS onde a IA errou claramente.
 *
 * Filosofia: Confiar na IA, intervir minimamente.
 */

// Verbos que indicam INEQUIVOCAMENTE entrada (dinheiro vindo para o usuário)
const VERBOS_ENTRADA_INEQUIVOCOS = [
  'ganhei', 'ganha', 'ganhar', 'ganhou',
  'recebi', 'receber', 'recebeu',
  'vendi', 'vender', 'vendeu',
]

// Verbos que indicam INEQUIVOCAMENTE saída (dinheiro saindo do usuário)
const VERBOS_SAIDA_INEQUIVOCOS = [
  'paguei', 'pagar', 'pagou',
  'gastei', 'gastar', 'gastou',
  'comprei', 'comprar', 'comprou',
]

export class AIService {
  private ai: GoogleGenAI | null = null

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey })
    }
  }

  /**
   * Pré-processa o texto para normalizar valores
   */
  private preprocessTexto(texto: string): string {
    let result = texto

    // Normaliza valores em formato brasileiro (R$ 3.817,55 -> 3817.55)
    // Padrão: R$ seguido de número com separador de milhar (ponto) e decimal (vírgula)
    result = result.replace(
      /R\$\s*(\d{1,3}(?:\.\d{3})+),(\d{2})/g,
      (_, inteiro, decimal) => {
        const valorSemPonto = inteiro.replace(/\./g, '')
        return `${valorSemPonto}.${decimal}`
      }
    )

    // Normaliza valores brasileiros sem R$ (ex: 3.817,55 -> 3817.55)
    // Só aplica se tiver ponto como separador de milhar E vírgula como decimal
    result = result.replace(
      /\b(\d{1,3}(?:\.\d{3})+),(\d{2})\b/g,
      (_, inteiro, decimal) => {
        const valorSemPonto = inteiro.replace(/\./g, '')
        return `${valorSemPonto}.${decimal}`
      }
    )

    // Normaliza valores simples com vírgula decimal (ex: 150,99 -> 150.99)
    result = result.replace(
      /\b(\d+),(\d{2})\b/g,
      '$1.$2'
    )

    // Converte "5k" para "5000", "2k" para "2000", etc.
    result = result.replace(/(\d+(?:\.\d+)?)\s*k\b/gi, (_, num) => {
      return String(parseFloat(num) * 1000)
    })

    // Converte "2mil" para "2000"
    result = result.replace(/(\d+)\s*mil\b/gi, (_, num) => {
      return String(parseInt(num) * 1000)
    })

    return result
  }

  /**
   * Extrai o nome correto do lançamento a partir do texto original
   * Corrige quando a IA retorna apenas o verbo (gastei, paguei, comprei)
   */
  private corrigirNome(nomeIA: string, textoOriginal: string): string {
    const nomeL = nomeIA.toLowerCase().trim()

    // Verbos que não devem ser usados como nome
    const verbosAcao = ['gastei', 'gasto', 'paguei', 'pago', 'comprei', 'compra', 'recebi', 'recebido']

    // Se o nome é apenas um verbo, tenta extrair o contexto do texto original
    if (verbosAcao.includes(nomeL)) {
      const textoL = textoOriginal.toLowerCase()

      // Padrões para extrair o objeto/contexto - ordem importa, do mais específico ao menos
      const padroes = [
        // "gastei 50 numa torta de nega maluca" -> "Torta de nega maluca"
        /(?:gastei|paguei|comprei|gasto|pago|compra)\s+\d+(?:[.,]\d+)?\s*(?:reais|real|r\$)?\s*(?:numa?|em|de|com|no|na|pro|pra|para)\s+(.+)$/i,
        // "gastei 50 com remédio" -> "Remédio"
        /(?:gastei|paguei|comprei)\s+\d+(?:[.,]\d+)?\s*(?:com|de|em|no|na)\s+(.+)$/i,
        // "recebi 500 do cliente" -> "Cliente"
        /(?:recebi|recebido)\s+\d+(?:[.,]\d+)?\s*(?:do|da|de)\s+(.+)$/i,
      ]

      for (const padrao of padroes) {
        const match = textoL.match(padrao)
        if (match && match[1]) {
          // Remove o valor se estiver no final
          let nome = match[1].replace(/\s*\d+(?:[.,]\d+)?\s*(?:reais|real|r\$)?$/i, '').trim()
          // Remove artigos do início
          nome = nome.replace(/^(?:um|uma|o|a|os|as)\s+/i, '').trim()
          if (nome.length > 1) {
            return nome.charAt(0).toUpperCase() + nome.slice(1)
          }
        }
      }
    }

    // Retorna o nome original se não conseguiu melhorar
    return nomeIA
  }

  /**
   * Verifica se o tipo retornado pela IA está correto
   *
   * IMPORTANTE: Confiamos na IA para a classificação principal.
   * Este método só corrige quando há verbos INEQUÍVOCOS no texto
   * que contradizem a classificação da IA.
   *
   * @param tipoIA - O tipo retornado pela IA
   * @param textoOriginal - O texto original do usuário
   * @returns O tipo corrigido (ou o original se não houver contradição)
   */
  private validarTipo(tipoIA: 'entrada' | 'saida', textoOriginal: string): 'entrada' | 'saida' {
    const textoL = textoOriginal.toLowerCase()

    // Verifica se há verbos INEQUÍVOCOS de entrada
    for (const verbo of VERBOS_ENTRADA_INEQUIVOCOS) {
      if (textoL.includes(verbo)) {
        // Se a IA disse saída mas tem "ganhei/vendi", corrige para entrada
        if (tipoIA === 'saida') {
          return 'entrada'
        }
        return tipoIA
      }
    }

    // Verifica se há verbos INEQUÍVOCOS de saída
    for (const verbo of VERBOS_SAIDA_INEQUIVOCOS) {
      if (textoL.includes(verbo)) {
        // Se a IA disse entrada mas tem "paguei/gastei/comprei", corrige para saída
        if (tipoIA === 'entrada') {
          return 'saida'
        }
        return tipoIA
      }
    }

    // Sem contradição clara - confia na IA
    return tipoIA
  }

  /**
   * Determina o tipo quando não há IA disponível (fallback)
   * Baseado apenas em verbos de ação no texto
   */
  private determinarTipoSemIA(textoOriginal: string): 'entrada' | 'saida' {
    const textoL = textoOriginal.toLowerCase()

    // Verifica verbos de entrada
    for (const verbo of VERBOS_ENTRADA_INEQUIVOCOS) {
      if (textoL.includes(verbo)) {
        return 'entrada'
      }
    }

    // Verifica verbos de saída
    for (const verbo of VERBOS_SAIDA_INEQUIVOCOS) {
      if (textoL.includes(verbo)) {
        return 'saida'
      }
    }

    // Default: saída (mais comum)
    return 'saida'
  }

  async parseLancamentos(texto: string, mes: string): Promise<ParseResult> {
    // Pré-processa o texto
    const textoProcessado = this.preprocessTexto(texto)

    if (!this.ai) {
      // Fallback: tenta parsing básico sem IA
      return this.parseBasico(textoProcessado, texto)
    }

    try {
      const prompt = `${SYSTEM_PROMPT}\n\nTexto do usuário: "${textoProcessado}"\n\nJSON:`

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      })

      let responseText = response.text || ''

      // Remove possíveis marcadores de código markdown
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      // Tenta fazer parse do JSON
      const parsed = JSON.parse(responseText)

      // Valida e normaliza os lançamentos
      const lancamentos: ParsedLancamento[] = []

      for (const l of parsed.lancamentos || []) {
        // Limite de segurança
        if (lancamentos.length >= MAX_LANCAMENTOS_POR_REQUEST) {
          break
        }

        if (l.nome && typeof l.valor === 'number' && l.valor > 0) {
          // Normaliza o nome (primeira letra maiúscula, limita tamanho)
          let nome = String(l.nome).trim()
          if (nome.length > 50) {
            nome = nome.substring(0, 50)
          }

          // Corrige o nome se a IA retornou apenas o verbo
          nome = this.corrigirNome(nome, texto)

          // Capitaliza primeira letra
          nome = nome.charAt(0).toUpperCase() + nome.slice(1)

          // Valida o tipo da IA (corrige apenas se houver contradição óbvia)
          const tipoIA = l.tipo === 'entrada' ? 'entrada' : 'saida'
          const tipoValidado = this.validarTipo(tipoIA, texto)

          // Valida categoria da IA ou usa fallback por keywords
          let categoriaId = validarCategoria(l.categoriaId, tipoValidado)
          if (!categoriaId) {
            categoriaId = categorizarPorKeywords(nome, tipoValidado)
          }

          lancamentos.push({
            tipo: tipoValidado,
            nome,
            valor: Math.round(Number(l.valor) * 100) / 100,
            diaPrevisto: l.diaPrevisto && l.diaPrevisto >= 1 && l.diaPrevisto <= 31
              ? Number(l.diaPrevisto)
              : null,
            categoriaId
          })
        }
      }

      return {
        lancamentos,
        erro: parsed.erro
      }

    } catch {
      // Fallback silencioso para parsing básico quando Gemini falha
      return this.parseBasico(textoProcessado, texto)
    }
  }

  /**
   * Parser básico como fallback (sem IA)
   */
  private parseBasico(textoProcessado: string, textoOriginal: string): ParseResult {
    const lancamentos: ParsedLancamento[] = []

    // Regex para encontrar padrões como "nome 123.45" ou "nome R$ 123,45"
    // Nota: textoProcessado já tem valores normalizados (3817.55 ao invés de 3.817,55)
    const patterns = [
      /([a-záàâãéèêíïóôõöúç\s]+)\s*(?:R\$\s*)?(\d+(?:\.\d{1,2})?)/gi,
      /(?:R\$\s*)?(\d+(?:\.\d{1,2})?)\s*(?:de\s+)?([a-záàâãéèêíïóôõöúç\s]+)/gi
    ]

    // Tenta extrair dia do texto
    const diaMatch = textoProcessado.match(/dia\s*(\d{1,2})/i)
    const diaPrevisto = diaMatch ? parseInt(diaMatch[1]) : null

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(textoProcessado)) !== null) {
        // Limite de segurança
        if (lancamentos.length >= MAX_LANCAMENTOS_POR_REQUEST) {
          break
        }

        let nome = match[1]?.trim() || match[2]?.trim()
        const valorStr = match[2] || match[1]

        // Pula se parece ser um dia
        if (/^dia$/i.test(nome) || /^\d+$/.test(nome)) continue

        // Valor já está normalizado pelo preprocessTexto
        const valor = parseFloat(valorStr)
        if (isNaN(valor) || valor <= 0) continue

        // Normaliza o nome
        nome = nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase()

        // Corrige o nome se for apenas um verbo
        nome = this.corrigirNome(nome, textoOriginal)

        // Determina o tipo baseado no texto (fallback sem IA)
        const tipo = this.determinarTipoSemIA(textoOriginal)

        // Categoriza por keywords
        const categoriaId = categorizarPorKeywords(nome, tipo)

        lancamentos.push({
          tipo,
          nome,
          valor: Math.round(valor * 100) / 100,
          diaPrevisto: diaPrevisto && diaPrevisto >= 1 && diaPrevisto <= 31 ? diaPrevisto : null,
          categoriaId
        })
      }
    }

    return { lancamentos }
  }
}

export const aiService = new AIService()
