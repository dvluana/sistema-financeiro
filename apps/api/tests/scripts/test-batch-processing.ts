/**
 * Script de teste para processamento em lote
 */

import 'dotenv/config'
import { aiService } from '../services/ai.service.js'

const textoTeste = `Loumar	R$ 3.750,00

WKM UX/UI	R$ 2.400,00

WKM Social Media	R$ 1.650,00

Stant 1	R$ 2.298,50

Stant 2	R$ 2.298,50

Horas Extras Stant Nov	R$ 1.194,00

Horas Extras Stant Nov	R$ 1.194,00

Stant Manutenção	R$ 597,00

Com Sorte	R$ 3.880,00

MSD Servicos	R$ 10.440,00

	

Topfarm	R$ 873

Clayton	R$ 730

Rafael	R$ 400,00

Projeto Jasmine LP 1/2	R$ 1.125,00

Projeto Jasmine LP 2/2	R$ 1.125,00

Projeto Sistema PP	R$ 8.250,00

Projeto Dockr 1/2	R$ 765,90

Projeto Dockr 2/2	R$ 765,90

Projeto Jasmine Site 50%	R$ 2.125,00

"Projeto Jasmine Site 50%	"	R$ 2.125,00`;

async function testarProcessamento() {
  console.log('============================================================')
  console.log('TESTE: Processamento em Lote com Formato Tabela')
  console.log('============================================================\n')

  console.log('📝 Texto de entrada (primeiras 5 linhas):')
  const linhas = textoTeste.split('\n').filter(l => l.trim())
  linhas.slice(0, 5).forEach(linha => {
    console.log(`   "${linha}"`)
  })
  console.log(`   ... e mais ${linhas.length - 5} linhas\n`)

  console.log('🔄 Processando...\n')

  const resultado = await aiService.parseLancamentos(textoTeste, '2024-12')

  console.log('📊 Resultado:')
  console.log(`   Total de lançamentos: ${resultado.lancamentos?.length || 0}`)
  
  if (resultado.lancamentos && resultado.lancamentos.length > 0) {
    console.log('\n📋 Lançamentos processados:\n')
    
    let totalEntradas = 0
    let totalSaidas = 0
    
    resultado.lancamentos.forEach((l, index) => {
      const emoji = l.tipo === 'entrada' ? '💚' : '💔'
      const tipoStr = l.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA'
      
      console.log(`   ${index + 1}. ${emoji} [${tipoStr}] ${l.nome}`)
      console.log(`      Valor: R$ ${l.valor.toFixed(2).replace('.', ',')}`)
      if (l.categoriaId) {
        console.log(`      Categoria: ${l.categoriaId}`)
      }
      console.log('')
      
      if (l.tipo === 'entrada') {
        totalEntradas += l.valor
      } else {
        totalSaidas += l.valor
      }
    })
    
    console.log('💰 Totais:')
    console.log(`   Total Entradas: R$ ${totalEntradas.toFixed(2).replace('.', ',')}`)
    console.log(`   Total Saídas: R$ ${totalSaidas.toFixed(2).replace('.', ',')}`)
    console.log(`   Saldo: R$ ${(totalEntradas - totalSaidas).toFixed(2).replace('.', ',')}`)
  }

  console.log('\n============================================================')
  
  // Verifica taxa de sucesso
  const esperado = 20 // Total de linhas válidas no texto
  const processados = resultado.lancamentos?.length || 0
  const taxa = (processados / esperado) * 100
  
  console.log(`📈 Taxa de Processamento: ${taxa.toFixed(1)}% (${processados}/${esperado})`)
  
  if (taxa === 100) {
    console.log('✅ SUCESSO TOTAL! Todos os lançamentos foram processados!')
  } else if (taxa >= 80) {
    console.log('🟡 BOM! Maioria dos lançamentos foi processada.')
  } else {
    console.log('❌ PROBLEMA! Muitos lançamentos não foram processados.')
  }
  
  console.log('============================================================\n')

  process.exit(0)
}

testarProcessamento().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
