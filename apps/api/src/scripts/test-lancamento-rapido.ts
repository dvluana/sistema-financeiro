/**
 * Teste Abrangente - Lançamento Rápido com IA
 * 
 * Mapeia gaps e valida a funcionalidade completa de parsing de lançamentos com IA.
 * Execute: tsx src/scripts/test-lancamento-rapido.ts
 */

import 'dotenv/config'
import { aiService } from '../services/ai.service.js'

interface TestCase {
  nome: string
  input: string
  esperado: {
    tipo?: 'entrada' | 'saida'
    nome?: string
    valor?: number
    categoriaId?: string
    diaPrevisto?: number | null
    minLancamentos?: number
    maxLancamentos?: number
  }
  descricao?: string
}

const CASOS_TESTE: TestCase[] = [
  // ============================================
  // CASOS BÁSICOS - Entrada/Saída Simples
  // ============================================
  {
    nome: 'Entrada simples - Salário',
    input: 'salário 5000',
    esperado: {
      tipo: 'entrada',
      nome: 'Salário',
      valor: 5000,
      categoriaId: 'default-salario',
    },
  },
  {
    nome: 'Saída simples - Netflix',
    input: 'netflix 55.90',
    esperado: {
      tipo: 'saida',
      nome: 'Netflix',
      valor: 55.9,
      categoriaId: 'default-lazer',
    },
  },
  {
    nome: 'Valor brasileiro - R$ 1.234,56',
    input: 'mercado R$ 1.234,56',
    esperado: {
      tipo: 'saida',
      nome: 'Mercado',
      valor: 1234.56,
      categoriaId: 'default-alimentacao',
    },
  },
  {
    nome: 'Valor abreviado - 5k',
    input: 'freela 5k',
    esperado: {
      tipo: 'entrada',
      nome: 'Freelance',
      valor: 5000,
      categoriaId: 'default-outros-entrada',
    },
  },
  {
    nome: 'Valor abreviado - 1.5k',
    input: 'uber 1.5k',
    esperado: {
      tipo: 'saida',
      nome: 'Uber',
      valor: 1500,
      categoriaId: 'default-transporte',
    },
  },

  // ============================================
  // CASOS DE CATEGORIZAÇÃO
  // ============================================
  {
    nome: 'Cartão - Nubank',
    input: 'nubank 3000',
    esperado: {
      tipo: 'saida',
      nome: 'Nubank',
      categoriaId: 'default-cartao',
    },
  },
  {
    nome: 'Cartão - Fatura C6',
    input: 'fatura c6 2500',
    esperado: {
      tipo: 'saida',
      nome: 'Fatura C6',
      categoriaId: 'default-cartao',
    },
  },
  {
    nome: 'Transporte - Gasolina',
    input: 'gasolina 200',
    esperado: {
      tipo: 'saida',
      nome: 'Gasolina',
      categoriaId: 'default-transporte',
    },
  },
  {
    nome: 'Saúde - Farmácia',
    input: 'farmácia 120',
    esperado: {
      tipo: 'saida',
      nome: 'Farmácia',
      categoriaId: 'default-saude',
    },
  },
  {
    nome: 'Investimentos - Dividendos',
    input: 'dividendos 150',
    esperado: {
      tipo: 'entrada',
      nome: 'Dividendos',
      categoriaId: 'default-investimentos',
    },
  },

  // ============================================
  // CASOS COM DIA PREVISTO
  // ============================================
  {
    nome: 'Com dia - Aluguel dia 5',
    input: 'aluguel 5 2400',
    esperado: {
      tipo: 'saida',
      nome: 'Aluguel',
      valor: 2400,
      diaPrevisto: 5,
      categoriaId: 'default-moradia',
    },
  },
  {
    nome: 'Formato tabela - Nome Dia Valor',
    input: 'Salário\t06\tR$ 3.817,55',
    esperado: {
      tipo: 'entrada',
      nome: 'Salário',
      valor: 3817.55,
      diaPrevisto: 6,
      categoriaId: 'default-salario',
    },
  },

  // ============================================
  // CASOS MÚLTIPLOS
  // ============================================
  {
    nome: 'Múltiplos lançamentos - Vírgula',
    input: 'netflix 55, mercado 500, uber 45',
    esperado: {
      minLancamentos: 3,
      maxLancamentos: 3,
    },
  },
  {
    nome: 'Múltiplos lançamentos - Quebra de linha',
    input: `netflix 55
mercado 500
uber 45`,
    esperado: {
      minLancamentos: 3,
      maxLancamentos: 3,
    },
  },
  {
    nome: 'Formato tabela múltipla',
    input: `Salário	06	R$ 3.817,55
Aluguel	05	R$ 2.400,00
Mercado	10	R$ 500,00`,
    esperado: {
      minLancamentos: 3,
      maxLancamentos: 3,
    },
  },

  // ============================================
  // CASOS EDGE - Contexto Ambíguo
  // ============================================
  {
    nome: 'Verbo explícito - Gastei',
    input: 'gastei 50 em pizza',
    esperado: {
      tipo: 'saida',
      nome: 'Pizza',
      valor: 50,
      categoriaId: 'default-alimentacao',
    },
  },
  {
    nome: 'Verbo explícito - Recebi',
    input: 'recebi 500 do cliente',
    esperado: {
      tipo: 'entrada',
      valor: 500,
    },
  },
  {
    nome: 'Sem contexto - Apenas valor',
    input: '500',
    esperado: {
      minLancamentos: 0, // Deve ignorar ou pedir mais contexto
    },
  },
  {
    nome: 'Texto sem valor',
    input: 'comprei um celular',
    esperado: {
      minLancamentos: 0, // Deve ignorar ou pedir valor
    },
  },

  // ============================================
  // CASOS DE IGNORAR
  // ============================================
  {
    nome: 'Indicador de mês - Deve ignorar',
    input: 'tudo de julho',
    esperado: {
      minLancamentos: 0,
    },
  },
  {
    nome: 'Cabeçalho - Deve ignorar',
    input: 'Cartões',
    esperado: {
      minLancamentos: 0,
    },
  },
  {
    nome: 'Linha vazia - Deve ignorar',
    input: '   ',
    esperado: {
      minLancamentos: 0,
    },
  },

  // ============================================
  // CASOS COMPLEXOS
  // ============================================
  {
    nome: 'Texto natural complexo',
    input: 'paguei a fatura do nubank de 3000 reais e também gastei 50 no ifood',
    esperado: {
      minLancamentos: 2,
      maxLancamentos: 2,
    },
  },
  {
    nome: 'Mistura entrada e saída',
    input: `recebi salário de 5000
paguei aluguel de 2400`,
    esperado: {
      minLancamentos: 2,
      maxLancamentos: 2,
    },
  },

  // ============================================
  // CASOS DE PLANILHA - Formato Real
  // ============================================
  {
    nome: 'Planilha - Nome + Valor com centavos',
    input: 'Loumar	R$ 3.750,00',
    esperado: {
      tipo: 'entrada',
      nome: 'Loumar',
      valor: 3750,
    },
  },
  {
    nome: 'Planilha - Nome + Valor sem centavos',
    input: 'Topfarm	R$ 873',
    esperado: {
      tipo: 'entrada',
      nome: 'Topfarm',
      valor: 873,
    },
  },
  {
    nome: 'Planilha - Nome com barra e valor',
    input: 'Projeto Jasmine LP 1/2	R$ 1.125,00',
    esperado: {
      tipo: 'entrada',
      nome: 'Projeto Jasmine LP 1/2',
      valor: 1125,
    },
  },
  {
    nome: 'Planilha - Nome com porcentagem',
    input: 'Projeto Jasmine Site 50%	R$ 2.125,00',
    esperado: {
      tipo: 'entrada',
      nome: 'Projeto Jasmine Site 50%',
      valor: 2125,
    },
  },
  {
    nome: 'Planilha - Valor grande com milhar',
    input: 'MSD Servicos	R$ 10.440,00',
    esperado: {
      tipo: 'entrada',
      nome: 'MSD Servicos',
      valor: 10440,
    },
  },
  {
    nome: 'Planilha - Nome com caracteres especiais',
    input: 'WKM UX/UI	R$ 2.400,00',
    esperado: {
      tipo: 'entrada',
      nome: 'WKM UX/UI',
      valor: 2400,
    },
  },
  {
    nome: 'Planilha - Múltiplas linhas simples',
    input: `Loumar	R$ 3.750,00
WKM UX/UI	R$ 2.400,00
Topfarm	R$ 873`,
    esperado: {
      minLancamentos: 3,
      maxLancamentos: 3,
    },
  },
  {
    nome: 'Planilha - Múltiplas linhas completas',
    input: `Loumar	R$ 3.750,00
WKM UX/UI	R$ 2.400,00
WKM Social Media	R$ 1.650,00
Stant 1	R$ 2.298,50
Stant 2	R$ 2.298,50
MSD Servicos	R$ 10.440,00`,
    esperado: {
      minLancamentos: 6,
      maxLancamentos: 6,
    },
  },
  {
    nome: 'Planilha - Com aspas e espaços extras',
    input: '"Projeto Jasmine Site 50%	"	R$ 2.125,00',
    esperado: {
      tipo: 'entrada',
      nome: 'Projeto Jasmine Site 50%',
      valor: 2125,
    },
  },
  {
    nome: 'Planilha - Valor com ponto decimal',
    input: 'Stant 1	R$ 2.298,50',
    esperado: {
      tipo: 'entrada',
      nome: 'Stant 1',
      valor: 2298.5,
    },
  },
  {
    nome: 'Planilha - Nome com números',
    input: 'Stant 1	R$ 2.298,50',
    esperado: {
      tipo: 'entrada',
      nome: 'Stant 1',
      valor: 2298.5,
    },
  },
  {
    nome: 'Planilha - Valor sem R$',
    input: 'Clayton	730',
    esperado: {
      tipo: 'entrada',
      nome: 'Clayton',
      valor: 730,
    },
  },
  {
    nome: 'Planilha - Linha vazia no meio',
    input: `MSD Servicos	R$ 10.440,00
	
Topfarm	R$ 873`,
    esperado: {
      minLancamentos: 2,
      maxLancamentos: 2,
    },
  },
]

// ============================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================

function validarResultado(
  resultado: any,
  esperado: TestCase['esperado'],
  nomeTeste: string
): { passou: boolean; erros: string[] } {
  const erros: string[] = []

  if (!resultado.lancamentos || !Array.isArray(resultado.lancamentos)) {
    erros.push('Resultado não contém array de lançamentos')
    return { passou: false, erros }
  }

  const lancamentos = resultado.lancamentos

  // Valida quantidade
  if (esperado.minLancamentos !== undefined) {
    if (lancamentos.length < esperado.minLancamentos) {
      erros.push(
        `Esperava pelo menos ${esperado.minLancamentos} lançamentos, mas recebeu ${lancamentos.length}`
      )
    }
  }
  if (esperado.maxLancamentos !== undefined) {
    if (lancamentos.length > esperado.maxLancamentos) {
      erros.push(
        `Esperava no máximo ${esperado.maxLancamentos} lançamentos, mas recebeu ${lancamentos.length}`
      )
    }
  }

  // Se não especificou quantidade, assume pelo menos 1
  if (
    esperado.minLancamentos === undefined &&
    esperado.maxLancamentos === undefined &&
    lancamentos.length === 0
  ) {
    erros.push('Esperava pelo menos 1 lançamento, mas recebeu 0')
  }

  // Valida primeiro lançamento (se esperado)
  if (lancamentos.length > 0 && esperado.tipo) {
    const primeiro = lancamentos[0]

    if (esperado.tipo && primeiro.tipo !== esperado.tipo) {
      erros.push(
        `Tipo esperado: ${esperado.tipo}, recebido: ${primeiro.tipo}`
      )
    }

    if (esperado.nome && primeiro.nome !== esperado.nome) {
      erros.push(
        `Nome esperado: "${esperado.nome}", recebido: "${primeiro.nome}"`
      )
    }

    if (esperado.valor !== undefined) {
      const valorRecebido = Number(primeiro.valor)
      const valorEsperado = esperado.valor
      const diferenca = Math.abs(valorRecebido - valorEsperado)
      if (diferenca > 0.01) {
        erros.push(
          `Valor esperado: ${valorEsperado}, recebido: ${valorRecebido}`
        )
      }
    }

    if (esperado.categoriaId && primeiro.categoriaId !== esperado.categoriaId) {
      erros.push(
        `Categoria esperada: ${esperado.categoriaId}, recebida: ${primeiro.categoriaId}`
      )
    }

    if (
      esperado.diaPrevisto !== undefined &&
      primeiro.diaPrevisto !== esperado.diaPrevisto
    ) {
      erros.push(
        `Dia previsto esperado: ${esperado.diaPrevisto}, recebido: ${primeiro.diaPrevisto}`
      )
    }
  }

  return { passou: erros.length === 0, erros }
}

// ============================================
// EXECUÇÃO DOS TESTES
// ============================================

async function executarTestes() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  🧪 TESTE - Lançamento Rápido com IA')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const mesAtual = new Date().toISOString().slice(0, 7) // YYYY-MM

  let passaram = 0
  let falharam = 0
  const detalhes: Array<{
    nome: string
    passou: boolean
    erros: string[]
    resultado?: any
  }> = []

  for (const teste of CASOS_TESTE) {
    try {
      console.log(`\n📝 Testando: ${teste.nome}`)
      if (teste.descricao) {
        console.log(`   ${teste.descricao}`)
      }
      console.log(`   Input: "${teste.input}"`)

      const inicio = Date.now()
      const resultado = await aiService.parseLancamentos(teste.input, mesAtual)
      const tempo = Date.now() - inicio

      console.log(`   ⏱️  Tempo: ${tempo}ms`)
      console.log(`   📊 Lançamentos encontrados: ${resultado.lancamentos.length}`)

      if (resultado.lancamentos.length > 0) {
        resultado.lancamentos.forEach((l, i) => {
          console.log(
            `      ${i + 1}. ${l.tipo} | ${l.nome} | R$ ${l.valor} | ${l.categoriaId || 'sem categoria'}`
          )
        })
      }

      const validacao = validarResultado(resultado, teste.esperado, teste.nome)

      if (validacao.passou) {
        console.log(`   ✅ PASSOU`)
        passaram++
      } else {
        console.log(`   ❌ FALHOU`)
        validacao.erros.forEach(erro => console.log(`      - ${erro}`))
        falharam++
      }

      detalhes.push({
        nome: teste.nome,
        passou: validacao.passou,
        erros: validacao.erros,
        resultado,
      })
    } catch (error) {
      console.log(`   ❌ ERRO: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      falharam++
      detalhes.push({
        nome: teste.nome,
        passou: false,
        erros: [error instanceof Error ? error.message : 'Erro desconhecido'],
      })
    }
  }

  // ============================================
  // RELATÓRIO FINAL
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  📊 RELATÓRIO FINAL')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log(`✅ Passaram: ${passaram}`)
  console.log(`❌ Falharam: ${falharam}`)
  console.log(`📈 Taxa de sucesso: ${((passaram / CASOS_TESTE.length) * 100).toFixed(1)}%`)

  if (falharam > 0) {
    console.log('\n🔍 DETALHES DOS FALHOS:\n')
    detalhes
      .filter(d => !d.passou)
      .forEach(d => {
        console.log(`❌ ${d.nome}`)
        d.erros.forEach(erro => console.log(`   - ${erro}`))
        if (d.resultado) {
          console.log(`   Resultado: ${JSON.stringify(d.resultado, null, 2)}`)
        }
        console.log()
      })
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  process.exit(falharam > 0 ? 1 : 0)
}

// Executa se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executarTestes().catch(error => {
    console.error('Erro fatal:', error)
    process.exit(1)
  })
}

export { executarTestes, CASOS_TESTE }

