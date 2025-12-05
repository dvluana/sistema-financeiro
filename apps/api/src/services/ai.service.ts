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

const SYSTEM_PROMPT = `Você é um assistente financeiro. Extraia lançamentos do texto do usuário.

## REGRAS CRÍTICAS

### VALORES ABREVIADOS (MUITO IMPORTANTE!)
- "5k" = 5000 (k = mil)
- "2k" = 2000
- "1.5k" = 1500
- "10k" = 10000
- "mil" ou "2mil" = 2000
- Valores NUNCA devem ser menores que o contexto sugere (salário não é R$ 5!)

### TIPO DO LANÇAMENTO

**ENTRADA** (receita - dinheiro que ENTRA):
- sal, salário, salario → ENTRADA
- freela, freelance → ENTRADA
- vendi, venda, vendas → ENTRADA
- recebi, recebido → ENTRADA
- bonus, bônus → ENTRADA
- comissão → ENTRADA
- renda, rendimento → ENTRADA
- dividendos, lucros → ENTRADA
- restituição → ENTRADA

**SAÍDA** (despesa - dinheiro que SAI):
- luz, água, gas, internet, telefone → SAÍDA
- aluguel, condomínio → SAÍDA
- parcela, fatura, boleto → SAÍDA
- mercado, supermercado → SAÍDA
- gasolina, combustível, uber → SAÍDA
- netflix, spotify, prime, streaming → SAÍDA
- farmácia, remédio → SAÍDA
- academia, escola, faculdade → SAÍDA
- paguei, gastei, comprei → SAÍDA

### NOME DO LANÇAMENTO (MUITO IMPORTANTE!)
O nome deve descrever O QUE foi comprado/recebido, NÃO a ação:
- "gastei 50 numa torta" → nome: "Torta" (NÃO "Gastei")
- "paguei 100 de uber" → nome: "Uber" (NÃO "Paguei")
- "comprei um livro por 80" → nome: "Livro" (NÃO "Comprei")
- "recebi 500 do cliente X" → nome: "Cliente X" ou "Pagamento cliente X"

Regras:
- NUNCA use verbos como nome (gastei, paguei, comprei, recebi)
- Extraia o OBJETO/CONTEXTO da frase
- Preserve detalhes: "torta de nega maluca" → "Torta de nega maluca"
- Mapeie abreviações: "sal" → "Salário", "freela" → "Freelance"
- Primeira letra maiúscula
- Marcas: Netflix, Spotify, Uber, iFood

## FORMATO
{"lancamentos":[{"tipo":"entrada","nome":"Nome","valor":1234.56,"diaPrevisto":5}]}

## EXEMPLOS CRÍTICOS

"sal 5k dia 5" → {"lancamentos":[{"tipo":"entrada","nome":"Salário","valor":5000,"diaPrevisto":5}]}

"freela 1200" → {"lancamentos":[{"tipo":"entrada","nome":"Freelance","valor":1200,"diaPrevisto":null}]}

"freela design 800" → {"lancamentos":[{"tipo":"entrada","nome":"Freelance design","valor":800,"diaPrevisto":null}]}

"vendi o celular por 500" → {"lancamentos":[{"tipo":"entrada","nome":"Venda celular","valor":500,"diaPrevisto":null}]}

"vendi notebook 2k" → {"lancamentos":[{"tipo":"entrada","nome":"Venda notebook","valor":2000,"diaPrevisto":null}]}

"luz 150 agua 80 gas 60" → {"lancamentos":[{"tipo":"saida","nome":"Luz","valor":150,"diaPrevisto":null},{"tipo":"saida","nome":"Água","valor":80,"diaPrevisto":null},{"tipo":"saida","nome":"Gás","valor":60,"diaPrevisto":null}]}

"parcela do carro 800" → {"lancamentos":[{"tipo":"saida","nome":"Parcela do carro","valor":800,"diaPrevisto":null}]}

"netflix 55 spotify 22" → {"lancamentos":[{"tipo":"saida","nome":"Netflix","valor":55,"diaPrevisto":null},{"tipo":"saida","nome":"Spotify","valor":22,"diaPrevisto":null}]}

"recebi 1000 do aluguel" → {"lancamentos":[{"tipo":"entrada","nome":"Aluguel recebido","valor":1000,"diaPrevisto":null}]}

"paguei aluguel 1500" → {"lancamentos":[{"tipo":"saida","nome":"Aluguel","valor":1500,"diaPrevisto":null}]}

"gastei 50 numa torta de nega maluca" → {"lancamentos":[{"tipo":"saida","nome":"Torta de nega maluca","valor":50,"diaPrevisto":null}]}

"comprei um tênis por 350" → {"lancamentos":[{"tipo":"saida","nome":"Tênis","valor":350,"diaPrevisto":null}]}

"paguei 200 no mercado" → {"lancamentos":[{"tipo":"saida","nome":"Mercado","valor":200,"diaPrevisto":null}]}

"gastei 80 com remédio" → {"lancamentos":[{"tipo":"saida","nome":"Remédio","valor":80,"diaPrevisto":null}]}

## IMPORTANTE
- "k" após número = multiplicar por 1000
- "freela" e "vendi" são SEMPRE entrada
- Retorne APENAS JSON válido
- Máximo ${MAX_LANCAMENTOS_POR_REQUEST} lançamentos
`

// Palavras que SEMPRE indicam entrada
const PALAVRAS_ENTRADA = [
  'salário', 'salario', 'sal',
  'freelance', 'freela',
  'vendi', 'venda', 'vendas',
  'recebi', 'recebido', 'receber',
  'bonus', 'bônus', 'bonificação',
  'comissão', 'comissao',
  'renda', 'rendimento', 'rendimentos',
  'dividendo', 'dividendos', 'lucro', 'lucros',
  'restituição', 'restituicao',
  '13º', 'decimo terceiro',
  'mesada', 'pensão'
]

// Palavras que indicam saída
const PALAVRAS_SAIDA = [
  'luz', 'água', 'agua', 'gás', 'gas', 'internet', 'telefone', 'celular',
  'aluguel', 'condomínio', 'condominio', 'iptu',
  'parcela', 'fatura', 'boleto', 'prestação',
  'mercado', 'supermercado', 'feira',
  'gasolina', 'combustível', 'combustivel', 'uber', '99', 'taxi',
  'netflix', 'spotify', 'prime', 'disney', 'hbo', 'streaming',
  'farmácia', 'farmacia', 'remédio', 'remedio',
  'academia', 'pilates', 'crossfit',
  'escola', 'faculdade', 'curso', 'mensalidade',
  'plano de saúde', 'plano de saude', 'seguro',
  'empréstimo', 'emprestimo', 'financiamento',
  'paguei', 'pago', 'pagar', 'gastei', 'gasto', 'gastar', 'comprei', 'compra'
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
   * Determina o tipo correto baseado no texto original e nome do lançamento
   */
  private corrigirTipo(nome: string, textoOriginal: string): 'entrada' | 'saida' {
    const nomeL = nome.toLowerCase()
    const textoL = textoOriginal.toLowerCase()

    // Verifica se alguma palavra de entrada está presente
    for (const palavra of PALAVRAS_ENTRADA) {
      if (nomeL.includes(palavra) || textoL.includes(palavra)) {
        // Exceção: "paguei aluguel" é saída, "recebi aluguel" é entrada
        if (palavra === 'aluguel') {
          if (textoL.includes('paguei') || textoL.includes('pagar')) {
            return 'saida'
          }
          if (textoL.includes('recebi') || textoL.includes('receber')) {
            return 'entrada'
          }
        }
        return 'entrada'
      }
    }

    // Se não encontrou entrada, assume saída
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

          // Corrige o tipo baseado nas palavras-chave
          const tipoCorrigido = this.corrigirTipo(nome, texto)

          lancamentos.push({
            tipo: tipoCorrigido,
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

    } catch (error) {
      console.error('Erro ao chamar Gemini:', error)
      // Fallback para parsing básico
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

        // Usa a função de correção de tipo
        const tipo = this.corrigirTipo(nome, textoOriginal)

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
