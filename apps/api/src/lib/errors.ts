/**
 * Error Handling Utilities
 *
 * Padroniza tratamento de erros e mensagens.
 * Em produção, retorna mensagens genéricas para não expor detalhes internos.
 */

// Códigos de erro padronizados
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * Erro de aplicação com código padronizado
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ErrorCodes.VALIDATION_ERROR, 400)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, ErrorCodes.NOT_FOUND, 404)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, ErrorCodes.UNAUTHORIZED, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, ErrorCodes.FORBIDDEN, 403)
    this.name = 'ForbiddenError'
  }
}

/**
 * Retorna mensagem de erro segura para o cliente
 * Em produção, não expõe detalhes de erros internos
 */
export function getSafeErrorMessage(error: unknown, defaultMessage: string = 'Erro interno'): string {
  // Em desenvolvimento, retorna mensagem real
  if (process.env.NODE_ENV !== 'production') {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  // Em produção, apenas erros de aplicação são expostos
  if (error instanceof AppError) {
    return error.message
  }

  // Erros genéricos retornam mensagem padrão
  return defaultMessage
}

/**
 * Formata resposta de erro padronizada
 */
export function formatErrorResponse(error: unknown, defaultMessage: string = 'Erro interno') {
  const message = getSafeErrorMessage(error, defaultMessage)

  if (error instanceof AppError) {
    return {
      error: message,
      code: error.code,
    }
  }

  return {
    error: message,
    code: ErrorCodes.INTERNAL_ERROR,
  }
}
