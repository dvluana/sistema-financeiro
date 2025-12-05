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

const SYSTEM_PROMPT = `Você é um assistente financeiro que interpreta textos em português brasileiro e extrai lançamentos financeiros.

REGRAS:
1. Identifique cada lançamento mencionado no texto
2. Determine se é ENTRADA (receita/ganho) ou SAÍDA (despesa/gasto)
3. Extraia o nome/descrição do lançamento
4. Extraia o valor numérico
5. Se mencionado, extraia o dia do mês (1-31)

CRITÉRIOS PARA TIPO:
- ENTRADA: salário, freelance, pagamento recebido, venda, renda, mesada, 13º, férias, bônus, comissão, aluguel recebido, dividendos, restituição
- SAÍDA: conta, boleto, fatura, aluguel (a pagar), luz, água, internet, telefone, mercado, gasolina, combustível, uber, transporte, comida, restaurante, delivery, ifood, netflix, spotify, academia, plano de saúde, seguro, parcela, empréstimo, cartão, escola, faculdade, curso, remédio, farmácia, pet, veterinário, manutenção, conserto

FORMATO DE RESPOSTA (JSON válido):
{
  "lancamentos": [
    {
      "tipo": "entrada" ou "saida",
      "nome": "descrição do lançamento",
      "valor": 1234.56,
      "diaPrevisto": 15 ou null
    }
  ]
}

EXEMPLOS:

Entrada: "salário 5000 dia 5"
Saída: {"lancamentos":[{"tipo":"entrada","nome":"Salário","valor":5000,"diaPrevisto":5}]}

Entrada: "luz 150, internet 99.90 dia 10, água 80"
Saída: {"lancamentos":[{"tipo":"saida","nome":"Luz","valor":150,"diaPrevisto":null},{"tipo":"saida","nome":"Internet","valor":99.90,"diaPrevisto":10},{"tipo":"saida","nome":"Água","valor":80,"diaPrevisto":null}]}

Entrada: "recebi 500 de freelance"
Saída: {"lancamentos":[{"tipo":"entrada","nome":"Freelance","valor":500,"diaPrevisto":null}]}

Entrada: "netflix 55.90, spotify 21.90, amazon prime 14.90"
Saída: {"lancamentos":[{"tipo":"saida","nome":"Netflix","valor":55.90,"diaPrevisto":null},{"tipo":"saida","nome":"Spotify","valor":21.90,"diaPrevisto":null},{"tipo":"saida","nome":"Amazon Prime","valor":14.90,"diaPrevisto":null}]}

IMPORTANTE:
- Retorne APENAS o JSON, sem explicações
- Capitalize a primeira letra do nome
- Valores devem ser números, não strings
- Se não conseguir interpretar, retorne {"lancamentos":[],"erro":"mensagem"}
`

export class AIService {
  private ai: GoogleGenAI | null = null

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey })
    }
  }

  async parseLancamentos(texto: string, mes: string): Promise<ParseResult> {
    if (!this.ai) {
      // Fallback: tenta parsing básico sem IA
      return this.parseBasico(texto)
    }

    try {
      const prompt = `${SYSTEM_PROMPT}\n\nTexto do usuário: "${texto}"\n\nRetorne o JSON:`

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
        if (l.nome && typeof l.valor === 'number' && l.valor > 0) {
          lancamentos.push({
            tipo: l.tipo === 'entrada' ? 'entrada' : 'saida',
            nome: String(l.nome).trim(),
            valor: Number(l.valor),
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
      return this.parseBasico(texto)
    }
  }

  /**
   * Parser básico como fallback (sem IA)
   */
  private parseBasico(texto: string): ParseResult {
    const lancamentos: ParsedLancamento[] = []

    // Palavras-chave de entrada
    const palavrasEntrada = [
      'salário', 'salario', 'freelance', 'renda', 'recebi', 'recebido',
      'venda', 'vendas', 'pagamento recebido', 'bônus', 'bonus', '13º',
      'décimo terceiro', 'ferias', 'férias', 'comissão', 'comissao'
    ]

    // Regex para encontrar padrões como "nome 123.45" ou "nome R$ 123,45"
    const patterns = [
      /([a-záàâãéèêíïóôõöúç\s]+)\s*(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)/gi,
      /(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:de\s+)?([a-záàâãéèêíïóôõöúç\s]+)/gi
    ]

    // Tenta extrair dia do texto
    const diaMatch = texto.match(/dia\s*(\d{1,2})/i)
    const diaPrevisto = diaMatch ? parseInt(diaMatch[1]) : null

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(texto)) !== null) {
        let nome = match[1]?.trim() || match[2]?.trim()
        let valorStr = match[2] || match[1]

        // Pula se parece ser um dia
        if (/^dia$/i.test(nome) || /^\d+$/.test(nome)) continue

        const valor = parseFloat(valorStr.replace(',', '.'))
        if (isNaN(valor) || valor <= 0) continue

        // Determina tipo baseado em palavras-chave
        const nomeNormalizado = nome.toLowerCase()
        const isEntrada = palavrasEntrada.some(p => nomeNormalizado.includes(p))

        lancamentos.push({
          tipo: isEntrada ? 'entrada' : 'saida',
          nome: nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase(),
          valor,
          diaPrevisto: diaPrevisto && diaPrevisto >= 1 && diaPrevisto <= 31 ? diaPrevisto : null
        })
      }
    }

    return { lancamentos }
  }
}

export const aiService = new AIService()
