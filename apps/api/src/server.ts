import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { authRoutes } from './routes/auth.routes.js'
import { lancamentoRoutes } from './routes/lancamento.routes.js'
import { configuracaoRoutes } from './routes/configuracao.routes.js'
import { categoriaRoutes } from './routes/categoria.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

// Serve frontend static files in production
const clientDistPath = path.join(__dirname, 'web')
await app.register(fastifyStatic, {
  root: clientDistPath,
  prefix: '/',
})

// SPA fallback - serve index.html for all non-API routes
app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api') || request.url.startsWith('/auth')) {
    reply.status(404).send({ error: 'Not found' })
  } else {
    reply.sendFile('index.html')
  }
})

const port = Number(process.env.PORT) || 3333

try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server running on http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
