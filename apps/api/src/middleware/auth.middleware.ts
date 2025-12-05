/**
 * Middleware de Autenticação
 *
 * Valida token de sessão e adiciona usuário ao request.
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/auth.service.js'
import type { Usuario } from '../schemas/auth.js'

// Estende o tipo do request para incluir usuário
declare module 'fastify' {
  interface FastifyRequest {
    usuario?: Usuario
  }
}

/**
 * Extrai token do header Authorization
 */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization
  if (!authHeader) return null

  // Formato: "Bearer <token>"
  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer' || !token) return null

  return token
}

/**
 * Middleware que requer autenticação
 * Retorna 401 se não autenticado
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request)

  if (!token) {
    return reply.status(401).send({ error: 'Token não fornecido' })
  }

  const usuario = await authService.validarToken(token)

  if (!usuario) {
    return reply.status(401).send({ error: 'Sessão inválida ou expirada' })
  }

  request.usuario = usuario
}

/**
 * Middleware opcional de autenticação
 * Adiciona usuário se autenticado, mas não bloqueia se não estiver
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = extractToken(request)

  if (token) {
    const usuario = await authService.validarToken(token)
    if (usuario) {
      request.usuario = usuario
    }
  }
}
