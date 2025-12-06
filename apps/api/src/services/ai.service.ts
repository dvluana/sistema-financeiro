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
}

interface ParseResult {
  lancamentos: ParsedLancamento[]
  erro?: string
}

// Limite máximo de lançamentos por requisição (segurança)
const MAX_LANCAMENTOS_POR_REQUEST = 20

const SYSTEM_PROMPT = `Você é um assistente de finanças pessoais especializado em classificar transações financeiras.

## SUA TAREFA
Extrair lançamentos financeiros do texto do usuário, identificando:
1. **tipo**: "entrada" (dinheiro ENTRANDO) ou "saida" (dinheiro SAINDO)
2. **nome**: descrição clara do que é o lançamento
3. **valor**: valor numérico
4. **diaPrevisto**: dia do mês se mencionado (1-31 ou null)

## REGRA FUNDAMENTAL DE CLASSIFICAÇÃO

### ENTRADA = Dinheiro ENTRANDO no bolso
Pergunta-chave: "O dinheiro está VINDO para mim?"
- Verbos: ganhei, recebi, vendi, lucrei, faturei, entrou
- Contextos: salário, freelance, venda, comissão, bônus, dividendos, restituição, reembolso, prêmio, mesada, pensão, aluguel que eu COBRO de inquilino

### SAÍDA = Dinheiro SAINDO do bolso
Pergunta-chave: "O dinheiro está SAINDO de mim?"
- Verbos: paguei, gastei, comprei, perdi
- Contextos: contas, parcelas, compras, assinaturas, aluguel que eu PAGO

## VALORES ABREVIADOS
- "5k" = 5000, "2k" = 2000, "1.5k" = 1500
- "mil" = 1000, "2mil" = 2000

## NOME DO LANÇAMENTO
- Extraia O QUE é, não a ação: "gastei 50 em pizza" → nome: "Pizza"
- Preserve contexto: "torta de limão" → "Torta de limão"
- Abreviações: "sal" → "Salário", "freela" → "Freelance"
- Primeira letra maiúscula

## EXEMPLOS DE CLASSIFICAÇÃO

ENTRADAS (dinheiro entrando):
- "ganhei 100 na rifa" → entrada (ganhei = recebi dinheiro)
- "recebi 5000 de salário" → entrada
- "vendi meu celular por 500" → entrada (venda = dinheiro entrando)
- "freela 1200" → entrada (trabalho = receita)
- "bônus 2000" → entrada
- "recebi o aluguel do inquilino 1500" → entrada

SAÍDAS (dinheiro saindo):
- "paguei 150 de luz" → saída
- "gastei 80 no mercado" → saída
- "comprei um tênis 350" → saída
- "netflix 55" → saída (assinatura = gasto)
- "aluguel 1500" → saída (pagar aluguel)
- "parcela do carro 800" → saída

## FORMATO DE RESPOSTA
Retorne APENAS JSON válido, sem markdown:
{"lancamentos":[{"tipo":"entrada","nome":"Nome","valor":1234.56,"diaPrevisto":5}]}

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
   * Pré-processa o texto para normalizar valores como "5k"
   */
  private preprocessTexto(texto: string): string {
    // Converte "5k" para "5000", "2k" para "2000", etc.
    return texto.replace(/(\d+(?:\.\d+)?)\s*k\b/gi, (match, num) => {
      return String(parseFloat(num) * 1000)
    }).replace(/(\d+)\s*mil\b/gi, (match, num) => {
      return String(parseInt(num) * 1000)
    })
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

          lancamentos.push({
            tipo: tipoValidado,
            nome,
            valor: Math.round(Number(l.valor) * 100) / 100,
            diaPrevisto: l.diaPrevisto && l.diaPrevisto >= 1 && l.diaPrevisto <= 31
              ? Number(l.diaPrevisto)
              : null
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
    const patterns = [
      /([a-záàâãéèêíïóôõöúç\s]+)\s*(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)/gi,
      /(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:de\s+)?([a-záàâãéèêíïóôõöúç\s]+)/gi
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

        const valor = parseFloat(valorStr.replace(',', '.'))
        if (isNaN(valor) || valor <= 0) continue

        // Normaliza o nome
        nome = nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase()

        // Corrige o nome se for apenas um verbo
        nome = this.corrigirNome(nome, textoOriginal)

        // Determina o tipo baseado no texto (fallback sem IA)
        const tipo = this.determinarTipoSemIA(textoOriginal)

        lancamentos.push({
          tipo,
          nome,
          valor: Math.round(valor * 100) / 100,
          diaPrevisto: diaPrevisto && diaPrevisto >= 1 && diaPrevisto <= 31 ? diaPrevisto : null
        })
      }
    }

    return { lancamentos }
  }
}

export const aiService = new AIService()
