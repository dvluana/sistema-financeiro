import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carrega o .env do apps/api
config({ path: resolve(__dirname, '../../.env') })

import { AIService } from '../services/ai.service.js'

const ai = new AIService()

const testes = [
  // Testes de extração de nome (IMPORTANTE!)
  { texto: "gastei 50 numa torta de nega maluca", esperado: { tipo: "saida", nomeContem: "torta" } },
  { texto: "comprei um tênis por 350", esperado: { tipo: "saida", nomeContem: "tênis" } },
  { texto: "paguei 200 no mercado", esperado: { tipo: "saida", nomeContem: "mercado" } },
  { texto: "gastei 80 com remédio", esperado: { tipo: "saida", nomeContem: "remédio" } },

  // Entradas básicas
  { texto: "sal 5k dia 5", esperado: { tipo: "entrada" } },
  { texto: "salário 5000", esperado: { tipo: "entrada" } },
  { texto: "recebi 800 de freelance", esperado: { tipo: "entrada" } },
  { texto: "freela design 1200", esperado: { tipo: "entrada" } },
  { texto: "vendi o celular por 500", esperado: { tipo: "entrada" } },
  { texto: "recebi pix do cliente 300", esperado: { tipo: "entrada" } },
  { texto: "bonus 2000", esperado: { tipo: "entrada" } },
  { texto: "comissão 450", esperado: { tipo: "entrada" } },

  // Saídas básicas
  { texto: "luz 150", esperado: { tipo: "saida" } },
  { texto: "agua 80", esperado: { tipo: "saida" } },
  { texto: "internet 100", esperado: { tipo: "saida" } },
  { texto: "aluguel 1500 dia 10", esperado: { tipo: "saida" } },
  { texto: "mercado 450", esperado: { tipo: "saida" } },
  { texto: "gasolina 200", esperado: { tipo: "saida" } },
  { texto: "uber 35", esperado: { tipo: "saida" } },
  { texto: "farmacia 80", esperado: { tipo: "saida" } },

  // Streamings
  { texto: "netflix 55", esperado: { tipo: "saida" } },
  { texto: "spotify 22", esperado: { tipo: "saida" } },
  { texto: "prime 15", esperado: { tipo: "saida" } },

  // Compostos
  { texto: "parcela do carro 800", esperado: { tipo: "saida" } },
  { texto: "plano de saude 400", esperado: { tipo: "saida" } },
  { texto: "conta de luz 180", esperado: { tipo: "saida" } },
  { texto: "seguro do carro 250", esperado: { tipo: "saida" } },

  // Múltiplos
  { texto: "luz 150 agua 80 gas 60", esperado: { quantidade: 3 } },
  { texto: "sal 5k, luz 150, internet 100", esperado: { quantidade: 3 } },
  { texto: "netflix 55 spotify 22 prime 15", esperado: { quantidade: 3 } },

  // Casos especiais
  { texto: "paguei 200 no mercado", esperado: { tipo: "saida" } },
  { texto: "gastei 150 com gasolina", esperado: { tipo: "saida" } },
  { texto: "recebi 1000 do aluguel", esperado: { tipo: "entrada" } },
]

async function runTests() {
  console.log("\n🧪 TESTANDO IA DE LANÇAMENTOS\n")
  console.log("=".repeat(70))

  let passed = 0
  let failed = 0

  for (const teste of testes) {
    try {
      const result = await ai.parseLancamentos(teste.texto, "2025-12")

      const lancamentos = result.lancamentos
      const primeiro = lancamentos[0]

      let ok = true
      const detalhes: string[] = []

      // Verifica quantidade
      if (teste.esperado.quantidade) {
        if (lancamentos.length !== teste.esperado.quantidade) {
          ok = false
          detalhes.push("qtd: " + lancamentos.length + " (esperado " + teste.esperado.quantidade + ")")
        }
      }

      // Verifica tipo
      if (teste.esperado.tipo && primeiro) {
        if (primeiro.tipo !== teste.esperado.tipo) {
          ok = false
          detalhes.push("tipo: " + primeiro.tipo + " (esperado " + teste.esperado.tipo + ")")
        }
      }

      // Verifica se nome contém termo esperado
      if ((teste.esperado as any).nomeContem && primeiro) {
        const nomeContem = (teste.esperado as any).nomeContem.toLowerCase()
        if (!primeiro.nome.toLowerCase().includes(nomeContem)) {
          ok = false
          detalhes.push("nome: \"" + primeiro.nome + "\" (deveria conter \"" + nomeContem + "\")")
        }
      }

      const icon = ok ? "✅" : "❌"

      if (ok) passed++
      else failed++

      console.log("")
      console.log(icon + ' "' + teste.texto + '"')

      if (primeiro) {
        const tipoStr = primeiro.tipo.toUpperCase()
        const diaStr = primeiro.diaPrevisto ? " | dia " + primeiro.diaPrevisto : ""
        console.log("   → " + tipoStr + " | " + primeiro.nome + " | R$ " + primeiro.valor + diaStr)
      }

      if (lancamentos.length > 1) {
        console.log("   → Total: " + lancamentos.length + " lançamentos")
        for (let i = 1; i < lancamentos.length; i++) {
          const l = lancamentos[i]
          console.log("     - " + l.tipo + " | " + l.nome + " | R$ " + l.valor)
        }
      }

      if (!ok) {
        console.log("   ⚠️  " + detalhes.join(", "))
      }

    } catch (err) {
      failed++
      console.log("")
      console.log('❌ "' + teste.texto + '"')
      console.log("   ⚠️  Erro: " + err)
    }
  }

  console.log("\n" + "=".repeat(70))
  console.log("\n📊 RESULTADO: " + passed + "/" + testes.length + " testes passaram")
  if (failed > 0) {
    console.log("   ❌ " + failed + " falharam")
  } else {
    console.log("   🎉 Todos os testes passaram!")
  }
  console.log("")
}

runTests().catch(console.error)
