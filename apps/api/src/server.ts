import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { authRoutes } from './routes/auth.routes.js'
import { lancamentoRoutes } from './routes/lancamento.routes.js'
import { configuracaoRoutes } from './routes/configuracao.routes.js'
import { categoriaRoutes } from './routes/categoria.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'

const app = Fastify({
  logger: true,
})

// CORS configuration
await app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// Register routes
await app.register(authRoutes)
await app.register(lancamentoRoutes)
await app.register(configuracaoRoutes)
await app.register(categoriaRoutes, { prefix: '/api/categorias' })
await app.register(dashboardRoutes)

// Health check
app.get('/health', async () => {
  return { status: 'ok' }
})

const port = Number(process.env.PORT) || 3333

try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server running on http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
