import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import compress from '@fastify/compress'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import { authRoutes } from './routes/auth.routes.js'
import { lancamentoRoutes } from './routes/lancamento.routes.js'
import { configuracaoRoutes } from './routes/configuracao.routes.js'
import { categoriaRoutes } from './routes/categoria.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'
import { aiRoutes } from './routes/ai.routes.js'
import { googleCalendarRoutes } from './routes/google-calendar.routes.js'
import { perfilRoutes } from './routes/perfil.routes.js'
import { validateEnv } from './lib/env.js'
import { supabase } from './lib/supabase.js'

// Validate environment variables at startup
validateEnv()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = Fastify({
  logger: process.env.NODE_ENV !== 'production' ? true : {
    level: 'warn',
    transport: undefined,
  },
  trustProxy: true,
})

// HTTPS redirect for Heroku (must be before other middlewares)
app.addHook('onRequest', async (request, reply) => {
  const proto = request.headers['x-forwarded-proto']
  const host = request.headers['host']

  // Only redirect in production and when accessed via HTTP
  if (proto === 'http' && host && process.env.NODE_ENV === 'production') {
    const redirectUrl = `https://${host}${request.url}`
    return reply.status(301).redirect(redirectUrl)
  }
})

// CORS configuration - restrict origins in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://www.financify.uxnaut.com.br',
      'https://financify.uxnaut.com.br',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[]
  : true // Allow all origins in development

await app.register(cors, {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-perfil-id'],
  credentials: true,
})

// Security headers - protects against common web vulnerabilities
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https://*.supabase.co'],
    },
  },
  // Desabilita frameguard para permitir que SPA funcione
  frameguard: process.env.NODE_ENV === 'production' ? { action: 'deny' } : false,
})

// Compressão HTTP, reduz tamanho das respostas em ~10x
await app.register(compress, {
  threshold: 1024, // Comprimir respostas > 1KB
  encodings: ['gzip', 'deflate'],
})

// Rate limiting, protect against abuse
await app.register(rateLimit, {
  max: 100, // Max 100 requests per window
  timeWindow: '1 minute',
  // Stricter limits for AI endpoint
  keyGenerator: (request) => {
    return request.headers['x-forwarded-for'] as string || request.ip
  },
})

// Register routes
await app.register(authRoutes)
await app.register(perfilRoutes)
await app.register(lancamentoRoutes)
await app.register(configuracaoRoutes)
await app.register(categoriaRoutes, { prefix: '/api/categorias' })
await app.register(dashboardRoutes)
await app.register(aiRoutes)
await app.register(googleCalendarRoutes)

// Health check - minimal in production, detailed in development
app.get('/health', async () => {
  const isProduction = process.env.NODE_ENV === 'production'

  // Em produção, apenas verifica se o servidor está respondendo
  // Não expõe detalhes de configuração ou status de serviços internos
  if (isProduction) {
    // Verifica apenas database (essencial)
    let dbOk = true
    try {
      const { error } = await supabase.from('lancamentos').select('id').limit(1)
      if (error) dbOk = false
    } catch {
      dbOk = false
    }

    return {
      status: dbOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
    }
  }

  // Em desenvolvimento, retorna detalhes completos
  const checks: Record<string, 'ok' | 'error'> = {
    server: 'ok',
    database: 'ok',
    ai: 'ok',
  }

  try {
    const { error } = await supabase.from('lancamentos').select('id').limit(1)
    if (error) checks.database = 'error'
  } catch {
    checks.database = 'error'
  }

  if (!process.env.GEMINI_API_KEY) {
    checks.ai = 'error'
  }

  const allOk = Object.values(checks).every(v => v === 'ok')

  return {
    status: allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }
})

// Serve frontend static files only if build exists (production)
const clientDistPath = path.join(__dirname, 'web')
if (fs.existsSync(clientDistPath)) {
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
} else {
  app.log.warn(`Client dist not found at ${clientDistPath} - skipping static serve`)
}

const port = Number(process.env.PORT) || 3333

try {
  await app.listen({ port, host: '0.0.0.0' })
  app.log.info(`Server running on http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
