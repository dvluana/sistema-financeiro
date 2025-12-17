/**
 * Google Calendar Routes
 *
 * Rotas para integração com Google Calendar (Lembrit).
 * Gerencia OAuth e busca de eventos.
 */

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as calendarService from '../services/google-calendar.service.js'

// Regex para validar UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function googleCalendarRoutes(app: FastifyInstance) {
  /**
   * Obtém URL do frontend de variável de ambiente
   */
  const getFrontendUrl = (): string => {
    // Primeiro tenta FRONTEND_URL, depois fallback baseado em NODE_ENV
    if (process.env.FRONTEND_URL) {
      return process.env.FRONTEND_URL
    }
    return process.env.NODE_ENV === 'production'
      ? 'https://sistema-financeiro-31052bfaa1f9.herokuapp.com'
      : 'http://localhost:5173'
  }

  /**
   * Verifica se Google Calendar está configurado
   */
  const isConfigured = () => {
    return !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.TOKEN_ENCRYPTION_KEY
    )
  }

  /**
   * GET /api/google-calendar/status
   * Verifica status da conexão do usuário
   */
  app.get('/api/google-calendar/status', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    if (!isConfigured()) {
      return reply.send({
        configured: false,
        connected: false,
      })
    }

    const usuarioId = request.usuario!.id
    const connected = await calendarService.isConnected(usuarioId)

    return reply.send({
      configured: true,
      connected,
    })
  })

  /**
   * GET /api/google-calendar/auth-url
   * Gera URL para iniciar fluxo OAuth
   */
  app.get('/api/google-calendar/auth-url', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    if (!isConfigured()) {
      return reply.status(503).send({
        error: 'Google Calendar não está configurado',
      })
    }

    const usuarioId = request.usuario!.id
    const authUrl = calendarService.getAuthUrl(usuarioId)

    return reply.send({ authUrl })
  })

  /**
   * GET /api/google-calendar/callback
   * Callback OAuth - recebe código e troca por tokens
   */
  app.get('/api/google-calendar/callback', async (request, reply) => {
    const { code, state, error } = request.query as {
      code?: string
      state?: string
      error?: string
    }

    const frontendUrl = getFrontendUrl()

    // Se usuário cancelou ou houve erro
    if (error || !code || !state) {
      return reply.redirect(`${frontendUrl}?lembrit=error&reason=${error || 'missing_params'}`)
    }

    // Decodifica e valida state com try-catch seguro
    let usuarioId: string
    try {
      const decoded = Buffer.from(state, 'base64').toString()
      const parsed = JSON.parse(decoded)
      usuarioId = parsed.usuarioId

      // Valida que é um UUID válido
      if (!usuarioId || typeof usuarioId !== 'string' || !UUID_REGEX.test(usuarioId)) {
        return reply.redirect(`${frontendUrl}?lembrit=error&reason=invalid_state`)
      }
    } catch {
      // JSON parse falhou ou base64 inválido
      return reply.redirect(`${frontendUrl}?lembrit=error&reason=invalid_state_format`)
    }

    try {
      // Troca código por tokens
      const { accessToken, refreshToken, expiryDate } = await calendarService.exchangeCodeForTokens(code)

      // Salva tokens criptografados
      await calendarService.saveTokens(usuarioId, accessToken, refreshToken, expiryDate)

      // Redireciona para o frontend com sucesso
      return reply.redirect(`${frontendUrl}?lembrit=success`)
    } catch (err) {
      request.log.error(err, 'OAuth callback token exchange failed')
      return reply.redirect(`${frontendUrl}?lembrit=error&reason=token_exchange_failed`)
    }
  })

  /**
   * DELETE /api/google-calendar/disconnect
   * Desconecta usuário do Google Calendar
   */
  app.delete('/api/google-calendar/disconnect', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const usuarioId = request.usuario!.id

    try {
      await calendarService.removeTokens(usuarioId)
      return reply.send({ success: true })
    } catch (err) {
      request.log.error(err, 'Failed to disconnect Google Calendar')
      return reply.status(500).send({ error: 'Falha ao desconectar' })
    }
  })

  /**
   * GET /api/google-calendar/events
   * Busca eventos próximos do calendário
   */
  app.get('/api/google-calendar/events', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    if (!isConfigured()) {
      return reply.status(503).send({
        error: 'Google Calendar não está configurado',
      })
    }

    const usuarioId = request.usuario!.id
    const { maxResults = '10', daysAhead = '7' } = request.query as {
      maxResults?: string
      daysAhead?: string
    }

    // Valida e limita parâmetros para prevenir DoS
    const maxResultsNum = parseInt(maxResults, 10)
    const daysAheadNum = parseInt(daysAhead, 10)

    if (!Number.isFinite(maxResultsNum) || maxResultsNum < 1 || maxResultsNum > 100) {
      return reply.status(400).send({ error: 'maxResults deve ser entre 1 e 100' })
    }
    if (!Number.isFinite(daysAheadNum) || daysAheadNum < 1 || daysAheadNum > 365) {
      return reply.status(400).send({ error: 'daysAhead deve ser entre 1 e 365' })
    }

    try {
      const events = await calendarService.getUpcomingEvents(
        usuarioId,
        maxResultsNum,
        daysAheadNum
      )

      return reply.send({ events })
    } catch (err: unknown) {
      const error = err as Error
      request.log.error(err, 'Failed to fetch calendar events')

      // Se token inválido, retornar status específico
      if (error.message?.includes('não conectado')) {
        return reply.status(401).send({ error: 'Não conectado ao Google Calendar' })
      }

      return reply.status(500).send({ error: 'Falha ao buscar eventos' })
    }
  })
}
