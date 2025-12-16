/**
 * Google Calendar Routes
 *
 * Rotas para integração com Google Calendar (Lembrit).
 * Gerencia OAuth e busca de eventos.
 */

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as calendarService from '../services/google-calendar.service.js'

export async function googleCalendarRoutes(app: FastifyInstance) {
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

    // URL base do frontend
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://sistema-financeiro-31052bfaa1f9.herokuapp.com'
      : 'http://localhost:5173'

    // Se usuário cancelou ou houve erro
    if (error || !code || !state) {
      return reply.redirect(`${frontendUrl}?lembrit=error&reason=${error || 'missing_params'}`)
    }

    try {
      // Decodifica state para obter usuarioId
      const { usuarioId } = JSON.parse(Buffer.from(state, 'base64').toString())

      if (!usuarioId) {
        return reply.redirect(`${frontendUrl}?lembrit=error&reason=invalid_state`)
      }

      // Troca código por tokens
      const { accessToken, refreshToken, expiryDate } = await calendarService.exchangeCodeForTokens(code)

      // Salva tokens criptografados
      await calendarService.saveTokens(usuarioId, accessToken, refreshToken, expiryDate)

      // Redireciona para o frontend com sucesso
      return reply.redirect(`${frontendUrl}?lembrit=success`)
    } catch (err) {
      console.error('Erro no callback OAuth:', err)
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
      console.error('Erro ao desconectar:', err)
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

    try {
      const events = await calendarService.getUpcomingEvents(
        usuarioId,
        parseInt(maxResults, 10),
        parseInt(daysAhead, 10)
      )

      return reply.send({ events })
    } catch (err: unknown) {
      const error = err as Error
      console.error('Erro ao buscar eventos:', error)

      // Se token inválido, retornar status específico
      if (error.message?.includes('não conectado')) {
        return reply.status(401).send({ error: 'Não conectado ao Google Calendar' })
      }

      return reply.status(500).send({ error: 'Falha ao buscar eventos' })
    }
  })
}
