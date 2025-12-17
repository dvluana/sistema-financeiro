/**
 * Script de teste para validar a função validarTipo
 */

import 'dotenv/config'
import { aiService } from '../services/ai.service.js'

async function test() {
  console.log('======================================')
  console.log('Teste de validação de tipo')
  console.log('======================================\n')

  const testCases = [
    { input: 'salário 5000', expectedTipo: 'entrada' },
    { input: 'freela 5k', expectedTipo: 'entrada' },
    { input: 'dividendos 150', expectedTipo: 'entrada' },
    { input: 'netflix 55', expectedTipo: 'saida' },
    { input: 'mercado 500', expectedTipo: 'saida' },
  ]

  let passed = 0
  let failed = 0

  for (const tc of testCases) {
    console.log(`Testing: "${tc.input}"`)
    try {
      const result = await aiService.parseLancamentos(tc.input, '2025-01')

      if (result.lancamentos.length === 0) {
        console.log(`  ❌ FALHOU - Nenhum lançamento retornado`)
        failed++
        continue
      }

      const tipo = result.lancamentos[0].tipo
      if (tipo === tc.expectedTipo) {
        console.log(`  ✅ PASSOU - tipo: ${tipo}`)
        passed++
      } else {
        console.log(`  ❌ FALHOU - esperado: ${tc.expectedTipo}, recebido: ${tipo}`)
        console.log(`     Nome: ${result.lancamentos[0].nome}`)
        failed++
      }
    } catch (err) {
      console.log(`  ❌ ERRO: ${err}`)
      failed++
    }
    console.log('')
  }

  console.log('======================================')
  console.log(`Resultado: ${passed} passou, ${failed} falhou`)
  console.log('======================================')
}

test()
