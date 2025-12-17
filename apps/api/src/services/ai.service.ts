/**
 * AI Service
 *
 * Serviço de integração com Google Gemini para interpretação
 * de lançamentos financeiros a partir de texto livre.
 */

import { GoogleGenAI } from "@google/genai";

interface ParsedLancamento {
  tipo: "entrada" | "saida";
  nome: string;
  valor: number;
  diaPrevisto: number | null;
  categoriaId: string | null; // ID da categoria padrão
}

interface ParseResult {
  lancamentos: ParsedLancamento[];
  erro?: string;
}

// Limite máximo de lançamentos por requisição (segurança)
const MAX_LANCAMENTOS_POR_REQUEST = 20;

// IDs das categorias padrão do sistema
const CATEGORIAS = {
  // Entradas
  SALARIO: "default-salario",
  INVESTIMENTOS: "default-investimentos",
  OUTROS_ENTRADA: "default-outros-entrada",
  // Saídas
  MORADIA: "default-moradia",
  ALIMENTACAO: "default-alimentacao",
  TRANSPORTE: "default-transporte",
  SAUDE: "default-saude",
  LAZER: "default-lazer",
  CARTAO: "default-cartao",
  OUTROS_SAIDA: "default-outros-saida",
};

// Lista de todas as categorias válidas para validação
const CATEGORIAS_VALIDAS = Object.values(CATEGORIAS);

// Keywords para categorização automática (fallback)
const KEYWORDS_CATEGORIAS: Record<string, string[]> = {
  // Entradas
  [CATEGORIAS.SALARIO]: [
    "salário",
    "salario",
    "sal",
    "holerite",
    "clt",
    "13º",
    "décimo terceiro",
    "décimo",
    "ferias",
    "férias",
    "pagamento trabalho",
    "folha",
  ],
  [CATEGORIAS.INVESTIMENTOS]: [
    "dividendo",
    "dividendos",
    "rendimento",
    "rendimentos",
    "juros",
    "juro",
    "resgate",
    "ações",
    "acoes",
    "fii",
    "fiis",
    "cdb",
    "poupança",
    "poupanca",
    "tesouro",
    "lci",
    "lca",
    "debenture",
    "investimento",
  ],
  // Saídas
  [CATEGORIAS.MORADIA]: [
    "aluguel",
    "condomínio",
    "condominio",
    "iptu",
    "luz",
    "energia",
    "elétrica",
    "água",
    "agua",
    "gás",
    "gas",
    "internet",
    "wifi",
    "manutenção casa",
    "conserto casa",
    "móveis",
    "moveis",
    "eletrodoméstico",
    "eletrodomestico",
    "geladeira",
    "fogão",
    "microondas",
    "máquina lavar",
    "tv",
    "televisão",
  ],
  [CATEGORIAS.ALIMENTACAO]: [
    "mercado",
    "supermercado",
    "feira",
    "açougue",
    "acougue",
    "padaria",
    "restaurante",
    "ifood",
    "rappi",
    "delivery",
    "lanche",
    "café",
    "cafe",
    "almoço",
    "almoco",
    "jantar",
    "comida",
    "pizza",
    "hamburguer",
    "sushi",
    "mcdonald",
    "burger",
    "subway",
    "starbucks",
    "hortifruti",
  ],
  [CATEGORIAS.TRANSPORTE]: [
    // Combustível PRIMEIRO (mais específico)
    "combustível",
    "combustivel",
    "gasolina",
    "álcool",
    "alcool",
    "etanol",
    "uber",
    "99",
    "táxi",
    "taxi",
    "ônibus",
    "onibus",
    "metrô",
    "metro",
    "estacionamento",
    "pedágio",
    "pedagio",
    "ipva",
    "seguro auto",
    "seguro carro",
    "manutenção carro",
    "oficina",
    "mecânico",
    "mecanico",
    "parcela carro",
    "parcela moto",
    "moto",
    "sem parar",
    "conectcar",
    "veloe",
  ],
  [CATEGORIAS.SAUDE]: [
    "farmácia",
    "farmacia",
    "remédio",
    "remedio",
    "medicamento",
    "médico",
    "medico",
    "consulta",
    "exame",
    "plano de saúde",
    "plano saude",
    "unimed",
    "bradesco saúde",
    "sulamerica",
    "dentista",
    "odonto",
    "psicólogo",
    "psicologo",
    "academia",
    "smartfit",
    "suplemento",
    "whey",
    "vitamina",
    "hospital",
    "clínica",
    "clinica",
    "fisioterapia",
    "drogaria",
    "droga raia",
    "drogasil",
    "pague menos",
  ],
  [CATEGORIAS.LAZER]: [
    "netflix",
    "spotify",
    "disney",
    "hbo",
    "amazon prime",
    "prime video",
    "youtube premium",
    "twitch",
    "deezer",
    "apple music",
    "xbox",
    "playstation",
    "steam",
    "jogos",
    "game",
    "cinema",
    "teatro",
    "show",
    "viagem",
    "hotel",
    "airbnb",
    "bar",
    "festa",
    "hobby",
    "streaming",
    "globoplay",
    "paramount",
    "crunchyroll",
    "max",
    "apple tv",
  ],
  [CATEGORIAS.CARTAO]: [
    // Bancos e fintechs (cartões)
    "nubank",
    "nu bank",
    "roxinho",
    "cartão nubank",
    "fatura nubank",
    "c6",
    "c6 bank",
    "cartão c6",
    "fatura c6",
    "inter",
    "banco inter",
    "cartão inter",
    "fatura inter",
    "itaú",
    "itau",
    "cartão itaú",
    "fatura itaú",
    "cartao itau",
    "fatura itau",
    "bradesco",
    "cartão bradesco",
    "fatura bradesco",
    "santander",
    "cartão santander",
    "fatura santander",
    "bb",
    "banco do brasil",
    "cartão bb",
    "fatura bb",
    "caixa",
    "cartão caixa",
    "fatura caixa",
    "original",
    "banco original",
    "cartão original",
    "next",
    "cartão next",
    "fatura next",
    "picpay",
    "pic pay",
    "cartão picpay",
    "mercado pago",
    "cartão mercado pago",
    "will bank",
    "willbank",
    "will",
    "neon",
    "cartão neon",
    "fatura neon",
    "pagbank",
    "pagseguro",
    "cartão pagbank",
    "btg",
    "btg pactual",
    "cartão btg",
    "xp",
    "cartão xp",
    "modal",
    "banco modal",
    "sofisa",
    "banco sofisa",
    "pan",
    "banco pan",
    "cartão pan",
    "bv",
    "banco bv",
    "cartão bv",
    "digio",
    "cartão digio",
    "credicard",
    "cartão credicard",
    "ourocard",
    "cartão ourocard",
    "elo",
    "cartão elo",
    "mastercard",
    "master card",
    "master",
    "visa",
    "amex",
    "american express",
    "hipercard",
    "hiper",
    // Termos genéricos de cartão
    "cartão de crédito",
    "cartao de credito",
    "cartão crédito",
    "cartao credito",
    "fatura cartão",
    "fatura cartao",
    "fatura do cartão",
    "fatura do cartao",
    "cartão",
    "cartao",
    "fatura",
    "parcela cartão",
    "parcela cartao",
    "anuidade",
    "anuidade cartão",
  ],
};

/**
 * Normaliza texto removendo acentos para comparação robusta
 */
function normalizarParaComparacao(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Categoriza um lançamento baseado em keywords
 * Usado como fallback quando IA não categoriza ou para validação
 * Ordem importa: categorias mais específicas primeiro
 */
function categorizarPorKeywords(
  nome: string,
  tipo: "entrada" | "saida"
): string {
  const nomeL = normalizarParaComparacao(nome);

  // Ordem específica para saídas: transporte antes de moradia (gasolina → transporte, não moradia)
  const ordemCategoriasSaida = [
    CATEGORIAS.TRANSPORTE, // Gasolina, combustível
    CATEGORIAS.ALIMENTACAO,
    CATEGORIAS.SAUDE,
    CATEGORIAS.LAZER,
    CATEGORIAS.CARTAO,
    CATEGORIAS.MORADIA, // Por último (mais genérica)
  ];

  if (tipo === "saida") {
    // Verifica categorias específicas primeiro
    for (const categoriaId of ordemCategoriasSaida) {
      const keywords = KEYWORDS_CATEGORIAS[categoriaId];
      for (const keyword of keywords) {
        // Normaliza a keyword também para comparação robusta
        if (nomeL.includes(normalizarParaComparacao(keyword))) {
          return categoriaId;
        }
      }
    }
  } else {
    // Para entradas, verifica na ordem normal
    for (const [categoriaId, keywords] of Object.entries(KEYWORDS_CATEGORIAS)) {
      const isCategoriaEntrada =
        categoriaId.includes("salario") ||
        categoriaId.includes("investimentos") ||
        categoriaId.includes("outros-entrada");
      if (!isCategoriaEntrada) continue;

      for (const keyword of keywords) {
        // Normaliza a keyword também para comparação robusta
        if (nomeL.includes(normalizarParaComparacao(keyword))) {
          return categoriaId;
        }
      }
    }
  }

  // Fallback: categoria "Outros" do tipo correspondente
  return tipo === "entrada"
    ? CATEGORIAS.OUTROS_ENTRADA
    : CATEGORIAS.OUTROS_SAIDA;
}

/**
 * Valida se uma categoriaId é válida e compatível com o tipo
 */
function validarCategoria(
  categoriaId: string | null | undefined,
  tipo: "entrada" | "saida"
): string | null {
  // Se não tem categoria, retorna null (será categorizado depois)
  if (!categoriaId) return null;

  // Verifica se é uma categoria válida
  if (!CATEGORIAS_VALIDAS.includes(categoriaId)) return null;

  // Verifica compatibilidade de tipo
  const isEntrada = tipo === "entrada";
  const isCategoriaEntrada =
    categoriaId.includes("salario") ||
    categoriaId.includes("investimentos") ||
    categoriaId.includes("outros-entrada");

  // Se tipo não bate, retorna null
  if (isEntrada !== isCategoriaEntrada) return null;

  return categoriaId;
}

/**
 * Verifica se o texto menciona cartão de crédito ou banco
 * Usado para priorizar a categoria de cartão
 */
function isCartaoCredito(texto: string): boolean {
  const textoL = normalizarParaComparacao(texto);
  const keywordsCartao = KEYWORDS_CATEGORIAS[CATEGORIAS.CARTAO];
  return keywordsCartao.some((keyword) =>
    textoL.includes(normalizarParaComparacao(keyword))
  );
}

const SYSTEM_PROMPT = `Você é um assistente de finanças pessoais. Extraia lançamentos financeiros do texto.

## EXEMPLOS CRÍTICOS (MEMORIZE!)

INPUT: "salário 5000"
OUTPUT: {"lancamentos":[{"tipo":"entrada","nome":"Salário","valor":5000,"diaPrevisto":null,"categoriaId":"default-salario"}]}

INPUT: "freela 5k"
OUTPUT: {"lancamentos":[{"tipo":"entrada","nome":"Freelance","valor":5000,"diaPrevisto":null,"categoriaId":"default-outros-entrada"}]}

INPUT: "dividendos 150"
OUTPUT: {"lancamentos":[{"tipo":"entrada","nome":"Dividendos","valor":150,"diaPrevisto":null,"categoriaId":"default-investimentos"}]}

INPUT: "gastei 50 em pizza"
OUTPUT: {"lancamentos":[{"tipo":"saida","nome":"Pizza","valor":50,"diaPrevisto":null,"categoriaId":"default-alimentacao"}]}

INPUT: "recebi 500 do cliente"
OUTPUT: {"lancamentos":[{"tipo":"entrada","nome":"Cliente","valor":500,"diaPrevisto":null,"categoriaId":"default-outros-entrada"}]}

INPUT: "paguei a fatura do nubank de 3000 reais e também gastei 50 no ifood"
OUTPUT: {"lancamentos":[{"tipo":"saida","nome":"Fatura Nubank","valor":3000,"diaPrevisto":null,"categoriaId":"default-cartao"},{"tipo":"saida","nome":"iFood","valor":50,"diaPrevisto":null,"categoriaId":"default-alimentacao"}]}

INPUT: "netflix 55, mercado 500, uber 45"
OUTPUT: {"lancamentos":[{"tipo":"saida","nome":"Netflix","valor":55,"diaPrevisto":null,"categoriaId":"default-lazer"},{"tipo":"saida","nome":"Mercado","valor":500,"diaPrevisto":null,"categoriaId":"default-alimentacao"},{"tipo":"saida","nome":"Uber","valor":45,"diaPrevisto":null,"categoriaId":"default-transporte"}]}

INPUT: "gasolina 200"
OUTPUT: {"lancamentos":[{"tipo":"saida","nome":"Gasolina","valor":200,"diaPrevisto":null,"categoriaId":"default-transporte"}]}

INPUT: "fatura c6 2500"
OUTPUT: {"lancamentos":[{"tipo":"saida","nome":"Fatura C6","valor":2500,"diaPrevisto":null,"categoriaId":"default-cartao"}]}

INPUT: "Loumar	R$ 3.750,00" (formato planilha com TAB)
OUTPUT: {"lancamentos":[{"tipo":"entrada","nome":"Loumar","valor":3750,"diaPrevisto":null,"categoriaId":"default-outros-entrada"}]}

## REGRAS FUNDAMENTAIS

### TIPO (CRÍTICO!)
- **ENTRADA** = dinheiro ENTRANDO: salário, freela, dividendos, vendas, recebimentos, clientes
- **SAÍDA** = dinheiro SAINDO: contas, compras, assinaturas, faturas, despesas

### VERBOS
- "gastei", "paguei", "comprei" = SEMPRE saída
- "ganhei", "recebi", "vendi" = SEMPRE entrada

### FORMATO DE PLANILHA (TAB entre nome e valor)
- Se tem TAB e NÃO é serviço conhecido = provavelmente ENTRADA (cliente/projeto)
- Serviços conhecidos (Netflix, Aluguel, etc.) = SAÍDA

## CATEGORIAS

### Entradas:
- "default-salario": salário, holerite, 13º, férias
- "default-investimentos": dividendos, rendimentos, juros, FIIs, ações
- "default-outros-entrada": freelance, vendas, reembolso, clientes

### Saídas:
- "default-transporte": gasolina, combustível, Uber, pedágio, IPVA
- "default-alimentacao": mercado, restaurante, iFood, delivery, pizza
- "default-saude": farmácia, médico, academia, plano de saúde
- "default-lazer": Netflix, Spotify, cinema, viagem, streaming
- "default-cartao": Nubank, C6, Inter, Itaú, fatura, cartão
- "default-moradia": aluguel, condomínio, luz, água, internet
- "default-outros-saida": outros gastos

## NOME
- Extraia O QUE é: "gastei 50 em pizza" → "Pizza"
- Preserve nomes completos: "Fatura C6" (não "Fatura c"), "Stant 1" (não "Stant")
- Primeira letra maiúscula

## FORMATO DE RESPOSTA
APENAS JSON, sem markdown:
{"lancamentos":[...]}

Máximo ${MAX_LANCAMENTOS_POR_REQUEST} lançamentos.`;

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
  "ganhei",
  "ganha",
  "ganhar",
  "ganhou",
  "recebi",
  "receber",
  "recebeu",
  "vendi",
  "vender",
  "vendeu",
];

// Verbos que indicam INEQUIVOCAMENTE saída (dinheiro saindo do usuário)
const VERBOS_SAIDA_INEQUIVOCOS = [
  "paguei",
  "pagar",
  "pagou",
  "gastei",
  "gastar",
  "gastou",
  "comprei",
  "comprar",
  "comprou",
];

export class AIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Pré-processa o texto para normalizar valores e separar múltiplos lançamentos
   */
  private preprocessTexto(texto: string): string {
    let result = texto;

    // PRIMEIRO: Detecta se é formato de tabela (com tabs) e preserva estrutura
    const temTabs = result.includes('\t');
    if (temTabs) {
      // Formato de tabela com tabs - apenas normaliza valores, não mexe na estrutura
      // Normaliza valores em formato brasileiro R$ 3.817,55 -> R$ 3817.55
      result = result.replace(
        /R\$\s*(\d{1,3}(?:\.\d{3})+),(\d{2})/g,
        (_, inteiro, decimal) => {
          const valorSemPonto = inteiro.replace(/\./g, "");
          return `R$ ${valorSemPonto}.${decimal}`;
        }
      );
      
      // Normaliza valores sem R$ (3.750,00 -> 3750.00)
      result = result.replace(
        /(\d{1,3}(?:\.\d{3})+),(\d{2})\b/g,
        (_, inteiro, decimal) => {
          const valorSemPonto = inteiro.replace(/\./g, "");
          return `${valorSemPonto}.${decimal}`;
        }
      );
      
      // Não faz mais transformações se for tabela
      return result;
    }

    // Caso não seja tabela, processa normalmente
    // Normaliza valores em formato brasileiro ANTES de separar por vírgula
    // R$ 3.817,55 -> R$ 3817.55
    result = result.replace(
      /R\$\s*(\d{1,3}(?:\.\d{3})+),(\d{2})/g,
      (_, inteiro, decimal) => {
        const valorSemPonto = inteiro.replace(/\./g, "");
        return `R$ ${valorSemPonto}.${decimal}`;
      }
    );

    // Normaliza valores brasileiros sem R$ mas com formato 3.817,55 -> 3817.55
    result = result.replace(
      /\b(\d{1,3}(?:\.\d{3})+),(\d{2})\b/g,
      (_, inteiro, decimal) => {
        const valorSemPonto = inteiro.replace(/\./g, "");
        return `${valorSemPonto}.${decimal}`;
      }
    );

    // Normaliza valores simples com vírgula decimal (ex: 150,99 -> 150.99)
    // MAS só se for seguido de espaço, fim de linha, ou letra (não outro número)
    result = result.replace(/\b(\d+),(\d{2})(?=\s|$|[a-zA-Z])/g, "$1.$2");

    // DEPOIS: Separa múltiplos lançamentos por vírgula
    // Padrão: vírgula + espaço + palavra (não número)
    // Ex: "netflix 55, mercado 500, uber 45" → quebra em linhas
    // Mas NÃO quebra se for formato de valor (R$ 1.234,56)
    if (result.includes(",")) {
      // Verifica se parece ter múltiplos itens separados por vírgula
      // Padrão: palavra + número + vírgula + espaço + palavra
      const multipleItemsPattern = /\w+\s+\d+[\.,]?\d*\s*,\s*\w+/;
      if (multipleItemsPattern.test(result)) {
        result = result.replace(/,\s+/g, "\n");
      }
    }

    // Também separa por "e" quando parece ser múltiplos itens
    // Ex: "paguei nubank 3000 e gastei 50 no ifood" → 2 linhas
    const ePattern =
      /(\d+[\.,]?\d*)\s+e\s+(gastei|paguei|comprei|recebi|ganhei)/gi;
    result = result.replace(ePattern, "$1\n$2");

    // Converte "5k" para "5000", "2k" para "2000", etc.
    result = result.replace(/(\d+(?:\.\d+)?)\s*k\b/gi, (_, num) => {
      return String(parseFloat(num) * 1000);
    });

    // Converte "2mil" para "2000"
    result = result.replace(/(\d+)\s*mil\b/gi, (_, num) => {
      return String(parseInt(num) * 1000);
    });

    return result;
  }

  /**
   * Verifica se o texto é um indicador de mês/período e NÃO um lançamento
   * Ex: "tudo de julho", "julho de 2025", "referente a março"
   */
  private isIndicadorMes(nome: string): boolean {
    const meses =
      "janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez";

    // Padrões que indicam que é um indicador de mês, não um lançamento
    const padroes = [
      // "tudo de julho", "tudo de março 2025", "tudo de julho de"
      new RegExp(`^tudo\\s+de\\s+(${meses})`, "i"),
      // "julho de 2025", "março 2025", "julho de" (parcial sem ano)
      new RegExp(`^(${meses})\\s+(de\\s*)?\\d{0,4}$`, "i"),
      // apenas o nome do mês
      new RegExp(`^(${meses})$`, "i"),
      // "referente a julho", "ref março"
      new RegExp(`^(?:referente|ref\\.?)\\s+(?:a\\s+)?(${meses})`, "i"),
      // "mês de julho", "mês: julho"
      new RegExp(`^m[êe]s\\s*[:de]+\\s*(${meses})`, "i"),
      // "para julho", "pra março"
      new RegExp(`^(?:para|pra)\\s+(${meses})`, "i"),
      // Cabeçalhos comuns
      /^cart[õo]es$/i,
      /^despesas?\s*(fixas?)?$/i,
      /^entradas?$/i,
      /^sa[íi]das?$/i,
      /^receitas?$/i,
    ];

    for (const padrao of padroes) {
      if (padrao.test(nome)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extrai o nome correto do lançamento a partir do texto original
   * Corrige quando a IA retorna apenas o verbo (gastei, paguei, comprei)
   */
  private corrigirNome(nomeIA: string, textoOriginal: string): string {
    const nomeL = nomeIA.toLowerCase().trim();

    // Verbos que não devem ser usados como nome
    const verbosAcao = [
      "gastei",
      "gasto",
      "paguei",
      "pago",
      "comprei",
      "compra",
      "recebi",
      "recebido",
    ];

    // Se o nome é apenas um verbo, tenta extrair o contexto do texto original
    if (verbosAcao.includes(nomeL)) {
      const textoL = textoOriginal.toLowerCase();

      // Padrões para extrair o objeto/contexto - ordem importa, do mais específico ao menos
      const padroes = [
        // "gastei 50 numa torta de nega maluca" -> "Torta de nega maluca"
        /(?:gastei|paguei|comprei|gasto|pago|compra)\s+\d+(?:[.,]\d+)?\s*(?:reais|real|r\$)?\s*(?:numa?|em|de|com|no|na|pro|pra|para)\s+(.+)$/i,
        // "gastei 50 com remédio" -> "Remédio"
        /(?:gastei|paguei|comprei)\s+\d+(?:[.,]\d+)?\s*(?:com|de|em|no|na)\s+(.+)$/i,
        // "recebi 500 do cliente" -> "Cliente"
        /(?:recebi|recebido)\s+\d+(?:[.,]\d+)?\s*(?:do|da|de)\s+(.+)$/i,
      ];

      for (const padrao of padroes) {
        const match = textoL.match(padrao);
        if (match && match[1]) {
          // Remove o valor se estiver no final
          let nome = match[1]
            .replace(/\s*\d+(?:[.,]\d+)?\s*(?:reais|real|r\$)?$/i, "")
            .trim();
          // Remove artigos do início
          nome = nome.replace(/^(?:um|uma|o|a|os|as)\s+/i, "").trim();
          if (nome.length > 1) {
            return nome.charAt(0).toUpperCase() + nome.slice(1);
          }
        }
      }
    }

    // Retorna o nome original se não conseguiu melhorar
    return nomeIA;
  }

  /**
   * Normaliza texto removendo acentos para comparação robusta
   */
  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Remove combining diacritical marks
  }

  /**
   * Verifica se o tipo retornado pela IA está correto
   *
   * IMPORTANTE: Este método corrige a classificação da IA quando há
   * palavras-chave ou verbos que indicam claramente o tipo correto.
   *
   * @param tipoIA - O tipo retornado pela IA
   * @param textoOriginal - O texto original do usuário
   * @param nome - O nome do lançamento (opcional, para validação adicional)
   * @returns O tipo corrigido (ou o original se não houver contradição)
   */
  private validarTipo(
    tipoIA: "entrada" | "saida",
    textoOriginal: string,
    nome?: string
  ): "entrada" | "saida" {
    // Normaliza texto e nome removendo acentos para comparação robusta
    const textoN = this.normalizarTexto(textoOriginal);
    const nomeN = nome ? this.normalizarTexto(nome) : "";

    // PALAVRAS-CHAVE QUE SEMPRE INDICAM ENTRADA (crítico!)
    // Versões SEM acento para comparação após normalização
    const PALAVRAS_ENTRADA_CRITICAS = [
      "salario",
      "holerite",
      "13o",
      "decimo terceiro",
      "ferias",
      "freela",
      "freelance",
      "freelancer",
      "dividendo",
      "dividendos",
      "rendimento",
      "rendimentos",
      "juros",
      "resgate",
      "investimento",
      "investimentos",
      "acoes",
      "fii",
      "fiis",
      "cdb",
      "poupanca",
      "lucro",
      "comissao",
      "bonus",
      "reembolso",
    ];

    // Verifica palavras-chave críticas de entrada no TEXTO
    for (const palavra of PALAVRAS_ENTRADA_CRITICAS) {
      if (textoN.includes(palavra)) {
        // Se a IA disse saída mas tem palavra de entrada, SEMPRE corrige
        if (tipoIA === "saida") {
          return "entrada";
        }
        return tipoIA;
      }
    }

    // Verifica também no NOME (mais importante para casos como "Salário" extraído)
    if (nomeN) {
      for (const palavra of PALAVRAS_ENTRADA_CRITICAS) {
        if (nomeN.includes(palavra)) {
          if (tipoIA === "saida") {
            return "entrada";
          }
          return tipoIA;
        }
      }
    }

    // Verifica se há verbos INEQUÍVOCOS de entrada
    for (const verbo of VERBOS_ENTRADA_INEQUIVOCOS) {
      if (textoN.includes(verbo)) {
        // Se a IA disse saída mas tem "ganhei/vendi", corrige para entrada
        if (tipoIA === "saida") {
          return "entrada";
        }
        return tipoIA;
      }
    }

    // Verifica se há verbos INEQUÍVOCOS de saída
    for (const verbo of VERBOS_SAIDA_INEQUIVOCOS) {
      if (textoN.includes(verbo)) {
        // Se a IA disse entrada mas tem "paguei/gastei/comprei", corrige para saída
        if (tipoIA === "entrada") {
          return "saida";
        }
        return tipoIA;
      }
    }

    // Sem contradição clara - confia na IA
    return tipoIA;
  }

  /**
   * Determina o tipo quando não há IA disponível (fallback)
   * Baseado em palavras-chave e verbos de ação no texto
   */
  private determinarTipoSemIA(textoOriginal: string): "entrada" | "saida" {
    // Normaliza texto removendo acentos para comparação robusta
    const textoN = this.normalizarTexto(textoOriginal);

    // PALAVRAS-CHAVE QUE SEMPRE INDICAM ENTRADA
    const PALAVRAS_ENTRADA = [
      "salario",
      "holerite",
      "13o",
      "decimo terceiro",
      "ferias",
      "freela",
      "freelance",
      "freelancer",
      "dividendo",
      "dividendos",
      "rendimento",
      "rendimentos",
      "juros",
      "resgate",
      "investimento",
      "investimentos",
      "acoes",
      "fii",
      "fiis",
      "cdb",
      "poupanca",
      "lucro",
      "comissao",
      "bonus",
      "reembolso",
      "cliente",
      "projeto",
      "venda",
      "recebimento",
      "pagamento recebido",
      "servicos",
      "servico",
      "honorarios",
      "hora extra",
      "horas extras",
      "manutencao", // quando é serviço prestado
    ];

    // Verifica palavras-chave de entrada primeiro (mais importante)
    for (const palavra of PALAVRAS_ENTRADA) {
      if (textoN.includes(palavra)) {
        return "entrada";
      }
    }
    
    // HEURÍSTICA: Detecta padrões de nomes de empresas/projetos (geralmente recebimentos)
    // Nomes próprios com maiúsculas ou padrões comuns
    const padroesProjetos = [
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/, // Nome próprio (Loumar, WKM, Stant)
      /\bltda\b/i,
      /\bs\.?a\.?\b/i,
      /\bme\b$/i, 
      /\bepp\b$/i,
      /\beireli\b/i,
      /\bservicos?\b/i,
      /\b(?:projeto|proj\.?)\b/i,
      /\b\d+\/\d+\b/, // Parcelas como "1/2", "2/2"
      /^[A-Z]{2,}/, // Siglas (WKM, MSD)
    ];
    
    for (const padrao of padroesProjetos) {
      if (padrao.test(textoOriginal)) {
        // Se tem padrão de empresa/projeto E tem valor alto (>500), provável entrada
        const valorMatch = textoOriginal.match(/(\d+(?:[.,]\d+)?)/);
        if (valorMatch) {
          const valor = parseFloat(valorMatch[1].replace(',', '.'));
          if (valor >= 500) {
            return "entrada";
          }
        }
      }
    }

    // Verifica verbos de entrada
    for (const verbo of VERBOS_ENTRADA_INEQUIVOCOS) {
      if (textoN.includes(verbo)) {
        return "entrada";
      }
    }

    // Verifica verbos de saída
    for (const verbo of VERBOS_SAIDA_INEQUIVOCOS) {
      if (textoN.includes(verbo)) {
        return "saida";
      }
    }
    
    // HEURÍSTICA: Nome próprio simples (uma palavra começando com maiúscula) geralmente é pagamento
    // Ex: Rafael, João, Maria, Pedro, Clayton, Topfarm
    const primeirasPalavras = textoOriginal.trim().split(/[\s\t]/)[0];
    const ehNomeProprio = /^[A-Z][a-z]+$/.test(primeirasPalavras);
    
    if (ehNomeProprio) {
      const valorMatch = textoOriginal.match(/(\d+(?:[.,]\d+)?)/);
      if (valorMatch) {
        const valor = parseFloat(valorMatch[1].replace(',', '.'));
        if (valor >= 200) { // Nome próprio + valor >= 200 = provável recebimento
          return "entrada";
        }
      }
    }
    
    // HEURÍSTICA FINAL: Se tem valor >= 1000 e parece nome de empresa, provável entrada
    const valorAltoMatch = textoOriginal.match(/(\d{4,}(?:[.,]\d+)?)/);
    if (valorAltoMatch && /^[A-Z]/.test(textoOriginal.trim())) {
      return "entrada";
    }

    // Default: saída (mais comum)
    return "saida";
  }

  async parseLancamentos(texto: string, mes: string): Promise<ParseResult> {
    // Pré-processa o texto
    const textoProcessado = this.preprocessTexto(texto);

    if (!this.ai) {
      // Fallback: tenta parsing básico sem IA
      return this.parseBasico(textoProcessado, texto);
    }

    try {
      const prompt = `${SYSTEM_PROMPT}\n\nTexto do usuário: "${textoProcessado}"\n\nJSON:`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      let responseText = response.text || "";

      // Remove possíveis marcadores de código markdown
      responseText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Tenta fazer parse do JSON
      const parsed = JSON.parse(responseText);

      // Valida e normaliza os lançamentos
      const lancamentos: ParsedLancamento[] = [];

      for (const l of parsed.lancamentos || []) {
        // Limite de segurança
        if (lancamentos.length >= MAX_LANCAMENTOS_POR_REQUEST) {
          break;
        }

        if (l.nome && typeof l.valor === "number" && l.valor > 0) {
          // Normaliza o nome (primeira letra maiúscula, limita tamanho)
          let nome = String(l.nome).trim();

          // Remove aspas extras que podem vir de planilhas
          nome = nome.replace(/^["']|["']$/g, "").trim();

          if (nome.length > 50) {
            nome = nome.substring(0, 50);
          }

          // Filtra nomes que são apenas números (IA errou ao separar colunas)
          const regexNumero = /^\d+(\.\d+)?$/;
          if (regexNumero.test(nome)) {
            continue;
          }

          // Filtra indicadores de mês/período que não são lançamentos
          const nomeL = nome.toLowerCase();
          if (this.isIndicadorMes(nomeL)) {
            continue;
          }

          // Corrige o nome se a IA retornou apenas o verbo
          nome = this.corrigirNome(nome, texto);

          // Preserva números e caracteres especiais no nome (ex: "Stant 1", "C6", "50%")
          // Capitaliza primeira letra mas preserva resto
          if (nome.length > 0) {
            nome = nome.charAt(0).toUpperCase() + nome.slice(1);
          }

          // Valida o tipo da IA (corrige apenas se houver contradição óbvia)
          const tipoIA = l.tipo === "entrada" ? "entrada" : "saida";
          // Usa texto ORIGINAL (não processado) para validação de palavras-chave
          // Passa também o nome para validação adicional
          let tipoValidado = this.validarTipo(tipoIA, texto, nome);

          // Validação adicional: se o nome contém palavras-chave de entrada, força entrada
          // Usa normalização para remover acentos e garantir match
          const nomeNormalizado = nome
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          const palavrasEntradaNoNome = [
            "salario",
            "freela",
            "freelance",
            "dividendo",
            "dividendos",
            "projeto",
            "cliente",
          ];
          if (
            tipoValidado === "saida" &&
            palavrasEntradaNoNome.some((p) => nomeNormalizado.includes(p))
          ) {
            tipoValidado = "entrada";
          }

          // Validação para formato de planilha: se tem TAB e nome não é serviço conhecido, é entrada
          const temTab = texto.includes("\t");
          const servicosConhecidos = [
            "netflix",
            "aluguel",
            "mercado",
            "farmacia",
            "uber",
            "ifood",
            "nubank",
            "cartao",
            "fatura",
            "luz",
            "agua",
            "gas",
            "internet",
          ];
          const nomeEServico = servicosConhecidos.some((s) =>
            nomeNormalizado.includes(s)
          );
          if (temTab && !nomeEServico && tipoValidado === "saida") {
            // Formato planilha sem serviço conhecido = provavelmente recebimento
            tipoValidado = "entrada";
          }

          // Valida categoria da IA ou usa fallback por keywords
          let categoriaId = validarCategoria(l.categoriaId, tipoValidado);

          // Sempre verifica categorização por keywords para validar/corrigir
          const categoriaPorKeywords = categorizarPorKeywords(
            nome,
            tipoValidado
          );

          // Se não tem categoria válida da IA, usa keywords
          if (!categoriaId) {
            categoriaId = categoriaPorKeywords;
          } else {
            // Validação adicional: se keywords sugerem categoria diferente e mais específica,
            // usa keywords (evita casos como "gasolina" → "moradia", "salário" → "outros")
            const categoriaOutros =
              tipoValidado === "entrada"
                ? CATEGORIAS.OUTROS_ENTRADA
                : CATEGORIAS.OUTROS_SAIDA;

            // Se keywords retornam categoria específica (não "outros"), sempre usa keywords
            // Isso garante que "gasolina" → "transporte", "salário" → "salario", etc.
            if (
              categoriaPorKeywords !== categoriaOutros &&
              categoriaPorKeywords !== categoriaId
            ) {
              categoriaId = categoriaPorKeywords;
            }
          }

          lancamentos.push({
            tipo: tipoValidado,
            nome,
            valor: Math.round(Number(l.valor) * 100) / 100,
            diaPrevisto:
              l.diaPrevisto && l.diaPrevisto >= 1 && l.diaPrevisto <= 31
                ? Number(l.diaPrevisto)
                : null,
            categoriaId,
          });
        }
      }

      return {
        lancamentos,
        erro: parsed.erro,
      };
    } catch {
      // Fallback silencioso para parsing básico quando Gemini falha
      return this.parseBasico(textoProcessado, texto);
    }
  }

  /**
   * Parser básico como fallback (sem IA)
   * Usa parsing linha por linha para formato de tabela
   */
  private parseBasico(
    textoProcessado: string,
    textoOriginal: string
  ): ParseResult {
    const lancamentos: ParsedLancamento[] = [];

    // Processa linha por linha para pegar formato de tabela
    const linhas = textoProcessado.split("\n");

    for (const linha of linhas) {
      // Limite de segurança
      if (lancamentos.length >= MAX_LANCAMENTOS_POR_REQUEST) {
        break;
      }

      const linhaTrim = linha.trim();
      if (!linhaTrim) continue;

      // Extrai valor monetário da linha - suporta diferentes formatos
      // Primeiro, tenta capturar formato brasileiro completo: R$ XXX,XX ou XXX,XX
      let valorMatch = linhaTrim.match(/R\$?\s*(\d+(?:\.\d{3})*,\d{2})\s*$/);
      let valor: number | null = null;
      
      if (valorMatch) {
        // Formato brasileiro com vírgula: 597,00 ou 3.750,00
        const valorStr = valorMatch[1].replace(/\./g, '').replace(',', '.');
        valor = parseFloat(valorStr);
      } else {
        // Tenta formato com ponto decimal: 765.90 ou só números: 500
        valorMatch = linhaTrim.match(/(\d+(?:\.\d{1,2})?)\s*$/);
        if (valorMatch) {
          valor = parseFloat(valorMatch[1]);
        }
      }
      
      if (!valor || isNaN(valor) || valor <= 0) continue;

      // valor já foi processado acima

      // Extrai dia da linha ANTES de modificar (número de 1-2 dígitos entre nome e valor)
      // Padrão: nome [espaços/tabs] DIA [espaços/tabs] valor
      const diaMatch = linhaTrim.match(
        /\s(\d{1,2})[\s\t]+\d+(?:\.\d{1,2})?\s*$/
      );
      let diaPrevisto: number | null = null;
      if (diaMatch) {
        const dia = parseInt(diaMatch[1]);
        if (dia >= 1 && dia <= 31) {
          diaPrevisto = dia;
        }
      }

      // Remove o valor do final (suporta diferentes formatos)
      let resto = linhaTrim
        .replace(/\s*R\$\s*\d+(?:\.\d{3})*,\d{2}\s*$/, "") // Remove R$ XXX,XX com espaços antes
        .replace(/\s*R\$\s*\d+(?:\.\d{1,2})?\s*$/, "") // Remove R$ XXX.XX
        .replace(/\s*\d+(?:\.\d{1,2})?\s*$/, "") // Remove valores simples
        .trim();

      // Remove tabs extras e espaços múltiplos
      resto = resto.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();

      // Remove possível "R$" que sobrou
      resto = resto.replace(/R\$\s*$/i, "").trim();

      // Remove número de dia que possa ter ficado no final do nome
      // Ex: "Vale alimentacao 10" -> "Vale alimentacao"
      resto = resto.replace(/\s+\d{1,2}$/, "").trim();

      if (!resto) continue;

      let nome = resto;

      // Filtra nomes que são apenas números (IA errou ao separar colunas)
      const regexNumero = /^\d+(\.\d+)?$/;
      if (regexNumero.test(nome)) {
        continue;
      }

      // Filtra indicadores de mês/período
      const nomeL = nome.toLowerCase();
      if (this.isIndicadorMes(nomeL)) {
        continue;
      }

      // Normaliza o nome (primeira letra maiúscula)
      nome = nome.charAt(0).toUpperCase() + nome.slice(1);

      // Corrige o nome se for apenas um verbo
      nome = this.corrigirNome(nome, textoOriginal);

      // Determina o tipo baseado na linha atual, não no texto completo
      // Isso permite processar múltiplas linhas com tipos diferentes
      // Para nomes simples com valores, usa heurística especial
      const tipo = this.determinarTipoSemIA(resto + " " + valor);

      // Categoriza por keywords
      const categoriaId = categorizarPorKeywords(nome, tipo);

      // Permite duplicatas com mesmo nome (ex: múltiplas parcelas)
      // O usuário pode ter vários lançamentos com mesmo nome
      // Como "Horas Extras" em diferentes dias

      lancamentos.push({
        tipo,
        nome,
        valor: Math.round(valor * 100) / 100,
        diaPrevisto,
        categoriaId,
      });
    }

    return { lancamentos };
  }
}

export const aiService = new AIService();
