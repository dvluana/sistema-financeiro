/**
 * Health Check Script
 *
 * Verifica se todas as dependências estão funcionando antes de iniciar o servidor.
 * - Conexão com o banco de dados (Supabase)
 * - Variáveis de ambiente necessárias
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
]

async function checkEnvVars(): Promise<boolean> {
  console.log('🔍 Verificando variáveis de ambiente...')

  const missing = requiredEnvVars.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente faltando:')
    missing.forEach(key => console.error(`   - ${key}`))
    return false
  }

  console.log('✅ Variáveis de ambiente OK')
  return true
}

async function checkDatabase(): Promise<boolean> {
  console.log('🔍 Verificando conexão com o banco de dados...')

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Tenta fazer uma query simples para verificar conexão
    const { error } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1)

    if (error) {
      // Se a tabela não existe, o erro é diferente de conexão
      if (error.code === '42P01') {
        console.error('❌ Tabela "usuarios" não encontrada. Execute as migrations.')
        return false
      }
      // Outros erros podem ser de permissão, que ainda indica conexão OK
      if (error.code !== 'PGRST116') {
        console.warn(`⚠️  Aviso do banco: ${error.message}`)
      }
    }

    console.log('✅ Conexão com banco de dados OK')
    return true
  } catch (error) {
    console.error('❌ Falha ao conectar com o banco de dados:')
    console.error(`   ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    return false
  }
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('       🏥 HEALTH CHECK - API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const envOk = await checkEnvVars()
  if (!envOk) {
    process.exit(1)
  }

  const dbOk = await checkDatabase()
  if (!dbOk) {
    process.exit(1)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('       ✅ Todos os checks passaram!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  process.exit(0)
}

main()
