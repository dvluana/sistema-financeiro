/**
 * Middleware de Autenticação
 *
 * Valida token de sessão e adiciona usuário ao request.
 * Implementa cache em memória para evitar queries repetidas ao banco.
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/auth.service.js'
import type { Usuario } from '../schemas/auth.js'

// Contexto do usuário/perfil para uso nas rotas
export interface ContextoRequest {
  userId: string
  perfilId: string
}

// Estende o tipo do request para incluir usuário e contexto
declare module 'fastify' {
  interface FastifyRequest {
    usuario?: Usuario
    perfilId?: string
    contexto?: ContextoRequest
  }
}

// ============================================
// CACHE DE TOKENS VALIDADOS
// ============================================
interface CachedSession {
  usuario: Usuario
  expira: number
}

// Cache em memória com TTL de 5 minutos
const tokenCache = new Map<string, CachedSession>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos em ms
const CACHE_CLEANUP_INTERVAL = 60 * 1000 // Limpar cache a cada 1 minuto

// Limpar tokens expirados periodicamente
setInterval(() => {
  const now = Date.now()
  for (const [token, session] of tokenCache.entries()) {
    if (session.expira <= now) {
      tokenCache.delete(token)
    }
  }
}, CACHE_CLEANUP_INTERVAL)

/**
 * Invalida cache de um token específico (usado no logout)
 */
export function invalidateTokenCache(token: string): void {
  tokenCache.delete(token)
}

/**
 * Invalida todos os tokens de um usuário (usado quando dados mudam)
 */
export function invalidateUserTokens(userId: string): void {
  for (const [token, session] of tokenCache.entries()) {
    if (session.usuario.id === userId) {
      tokenCache.delete(token)
    }
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
 * Valida token com cache para evitar queries repetidas
 */
async function validateTokenWithCache(token: string): Promise<Usuario | null> {
  // 1. Verificar cache primeiro
  const cached = tokenCache.get(token)
  if (cached && cached.expira > Date.now()) {
    return cached.usuario
  }

  // 2. Se não está no cache ou expirou, validar no banco
  const usuario = await authService.validarToken(token)

  // 3. Cachear resultado se válido
  if (usuario) {
    tokenCache.set(token, {
      usuario,
      expira: Date.now() + CACHE_TTL,
    })
  } else {
    // Remover do cache se inválido
    tokenCache.delete(token)
  }

  return usuario
}

/**
 * Extrai perfilId do header x-perfil-id
 */
function extractPerfilId(request: FastifyRequest): string | null {
  const perfilId = request.headers['x-perfil-id']
  if (typeof perfilId === 'string' && perfilId.length > 0) {
    return perfilId
  }
  return null
}

/**
 * Middleware que requer autenticação
 * Retorna 401 se não autenticado
 * Também extrai x-perfil-id do header e configura o contexto
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request)

  if (!token) {
    return reply.status(401).send({ error: 'Token não fornecido' })
  }

  const usuario = await validateTokenWithCache(token)

  if (!usuario) {
    return reply.status(401).send({ error: 'Sessão inválida ou expirada' })
  }

  request.usuario = usuario

  // Extrai perfilId do header
  const perfilId = extractPerfilId(request)
  if (perfilId) {
    request.perfilId = perfilId
    request.contexto = {
      userId: usuario.id,
      perfilId,
    }
  }
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
    const usuario = await validateTokenWithCache(token)
    if (usuario) {
      request.usuario = usuario
    }
  }
}
