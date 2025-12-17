/**
 * Google Calendar Service
 *
 * Gerencia integração OAuth com Google Calendar API.
 * Responsável por autenticação, busca de eventos e gerenciamento de tokens.
 */

import { google, calendar_v3 } from 'googleapis'
import crypto from 'crypto'
import { supabase } from '../lib/supabase.js'

const ENCRYPTION_ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

// Configuração do Google OAuth
const getGoogleConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  encryptionKey: process.env.TOKEN_ENCRYPTION_KEY!,
})

/**
 * Criptografa um texto usando AES-256-CBC
 */
function encrypt(text: string): string {
  const key = getGoogleConfig().encryptionKey
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(key), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

/**
 * Descriptografa um texto usando AES-256-CBC
 */
function decrypt(text: string): string {
  const key = getGoogleConfig().encryptionKey
  const [ivHex, encryptedHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(key), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

/**
 * Cria cliente OAuth2 do Google
 */
function createOAuth2Client() {
  const config = getGoogleConfig()
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  )
}

/**
 * Gera URL de autorização OAuth
 */
export function getAuthUrl(usuarioId: string): string {
  const oauth2Client = createOAuth2Client()
  const state = Buffer.from(JSON.stringify({ usuarioId })).toString('base64')

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    state,
    prompt: 'consent', // Força consentimento para obter refresh token
  })
}

/**
 * Troca código de autorização por tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiryDate: number
}> {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Tokens inválidos recebidos do Google')
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
  }
}

/**
 * Salva tokens criptografados no banco
 */
export async function saveTokens(
  usuarioId: string,
  accessToken: string,
  refreshToken: string,
  expiryDate: number
): Promise<void> {
  const encryptedAccess = encrypt(accessToken)
  const encryptedRefresh = encrypt(refreshToken)

  const { error } = await supabase
    .from('google_calendar_tokens')
    .upsert({
      usuario_id: usuarioId,
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expiry: new Date(expiryDate).toISOString(),
    }, {
      onConflict: 'usuario_id',
    })

  if (error) {
    throw new Error(`Erro ao salvar tokens: ${error.message}`)
  }
}

/**
 * Busca tokens do usuário no banco
 */
export async function getTokens(usuarioId: string): Promise<{
  accessToken: string
  refreshToken: string
  tokenExpiry: Date
} | null> {
  const { data, error } = await supabase
    .from('google_calendar_tokens')
    .select('access_token, refresh_token, token_expiry')
    .eq('usuario_id', usuarioId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    accessToken: decrypt(data.access_token),
    refreshToken: decrypt(data.refresh_token),
    tokenExpiry: new Date(data.token_expiry),
  }
}

/**
 * Remove tokens do usuário (desconectar)
 */
export async function removeTokens(usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from('google_calendar_tokens')
    .delete()
    .eq('usuario_id', usuarioId)

  if (error) {
    throw new Error(`Erro ao remover tokens: ${error.message}`)
  }
}

/**
 * Verifica se usuário está conectado ao Google Calendar
 */
export async function isConnected(usuarioId: string): Promise<boolean> {
  const tokens = await getTokens(usuarioId)
  return tokens !== null
}

/**
 * Obtém access token válido, renovando se necessário
 */
async function getValidAccessToken(usuarioId: string): Promise<string> {
  const tokens = await getTokens(usuarioId)

  if (!tokens) {
    throw new Error('Usuário não conectado ao Google Calendar')
  }

  // Verifica se token ainda é válido (com margem de 5 min)
  const isExpired = tokens.tokenExpiry < new Date(Date.now() + 5 * 60 * 1000)

  if (!isExpired) {
    return tokens.accessToken
  }

  // Token expirado - usar refresh token
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    refresh_token: tokens.refreshToken,
  })

  const { credentials } = await oauth2Client.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error('Falha ao renovar token')
  }

  // Salvar novo access token
  await saveTokens(
    usuarioId,
    credentials.access_token,
    tokens.refreshToken,
    credentials.expiry_date || Date.now() + 3600 * 1000
  )

  return credentials.access_token
}

/**
 * Formato de evento para o frontend
 */
export interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  timeUntil: string
  location?: string
  description?: string
  isAllDay: boolean
  meetLink?: string
  htmlLink?: string
}

/**
 * Calcula tempo até o evento em formato legível
 */
function calculateTimeUntil(eventStart: string): string {
  const start = new Date(eventStart)
  const now = new Date()
  const diffMs = start.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)

  if (diffMins < 0) return 'Agora'
  if (diffMins === 0) return 'Agora'
  if (diffMins === 1) return 'Em 1 minuto'
  if (diffMins < 60) return `Em ${diffMins} minutos`

  const diffHours = Math.round(diffMins / 60)
  if (diffHours === 1) return 'Em 1 hora'
  if (diffHours < 24) return `Em ${diffHours} horas`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return 'Amanhã'
  return `Em ${diffDays} dias`
}

/**
 * Busca eventos do calendário do usuário
 */
export async function getUpcomingEvents(
  usuarioId: string,
  maxResults: number = 10,
  daysAhead: number = 7
): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken(usuarioId)

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + daysAhead)

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: endDate.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = response.data.items || []

  return events.map((event: calendar_v3.Schema$Event) => {
    const isAllDay = !event.start?.dateTime
    const startTime = event.start?.dateTime || event.start?.date || ''
    const endTime = event.end?.dateTime || event.end?.date || ''

    // Extrai link do Google Meet (conferenceData ou hangoutLink)
    const meetLink = event.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri || event.hangoutLink || undefined

    return {
      id: event.id || '',
      title: event.summary || 'Sem título',
      startTime,
      endTime,
      timeUntil: calculateTimeUntil(startTime),
      location: event.location || undefined,
      description: event.description || undefined,
      isAllDay,
      meetLink,
      htmlLink: event.htmlLink || undefined,
    }
  })
}
