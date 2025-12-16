/**
 * Lembretes Page
 *
 * Tela de lembretes integrada com Google Calendar.
 * Mostra eventos próximos com tempo restante até cada compromisso.
 */

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Calendar, Clock, MapPin, Link2, Unlink, Loader2, RefreshCw, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { googleCalendarApi, type CalendarEvent } from '@/lib/api'
import { useAuthStore } from '@/stores/useAuthStore'

interface LembretesProps {
  onOpenConfig: () => void
}

export function Lembretes({ onOpenConfig }: LembretesProps) {
  const { usuario } = useAuthStore()
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extrai nome do usuário (primeiro nome apenas)
  const primeiroNome = usuario?.nome?.split(' ')[0] || 'Usuário'

  // Verifica status da conexão
  const checkStatus = useCallback(async () => {
    try {
      const status = await googleCalendarApi.getStatus()
      setIsConfigured(status.configured)
      setIsConnected(status.connected)
      return status.connected
    } catch {
      setIsConfigured(false)
      setIsConnected(false)
      return false
    }
  }, [])

  // Busca eventos do calendário
  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { events } = await googleCalendarApi.getEvents(20, 7)
      setEvents(events)
    } catch (err) {
      setError('Não foi possível carregar os eventos')
      console.error('Erro ao buscar eventos:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Inicializa verificando status e buscando eventos se conectado
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const connected = await checkStatus()
      if (connected) {
        await fetchEvents()
      } else {
        setIsLoading(false)
      }
    }
    init()

    // Verifica se voltou do OAuth com sucesso/erro
    const params = new URLSearchParams(window.location.search)
    const lembritStatus = params.get('lembrit')
    if (lembritStatus === 'success') {
      // Remove params da URL
      window.history.replaceState({}, '', window.location.pathname)
      init()
    } else if (lembritStatus === 'error') {
      setError('Falha ao conectar com Google Calendar')
      window.history.replaceState({}, '', window.location.pathname)
      setIsLoading(false)
    }
  }, [checkStatus, fetchEvents])

  // Conecta ao Google Calendar
  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const { authUrl } = await googleCalendarApi.getAuthUrl()
      window.location.href = authUrl
    } catch (err) {
      setError('Não foi possível iniciar a conexão')
      setIsConnecting(false)
    }
  }

  // Desconecta do Google Calendar
  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      await googleCalendarApi.disconnect()
      setIsConnected(false)
      setEvents([])
    } catch {
      setError('Falha ao desconectar')
    } finally {
      setIsLoading(false)
    }
  }

  // Formata data/hora para exibição
  const formatDateTime = (dateStr: string, isAllDay: boolean) => {
    const date = new Date(dateStr)
    if (isAllDay) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    }
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // Agrupa eventos por dia
  const groupEventsByDay = (events: CalendarEvent[]) => {
    const groups: { [key: string]: CalendarEvent[] } = {}

    events.forEach(event => {
      const date = new Date(event.startTime)
      const key = date.toISOString().split('T')[0]
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(event)
    })

    return Object.entries(groups).map(([date, events]) => ({
      date,
      label: formatDayLabel(date),
      events,
    }))
  }

  // Formata label do dia (Hoje, Amanhã, ou data)
  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === today.getTime()) return 'Hoje'
    if (date.getTime() === tomorrow.getTime()) return 'Amanhã'
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const groupedEvents = groupEventsByDay(events)

  // Estado: Não configurado (admin não setou as credenciais)
  if (isConfigured === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background pb-24">
        <Header primeiroNome={primeiroNome} onOpenConfig={onOpenConfig} />
        <div className="max-w-[720px] mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-titulo text-foreground">Em breve</h2>
            <p className="text-corpo text-muted-foreground max-w-sm">
              A integração com Google Calendar ainda está sendo configurada.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Estado: Não conectado
  if (!isConnected && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background pb-24">
        <Header primeiroNome={primeiroNome} onOpenConfig={onOpenConfig} />
        <div className="max-w-[720px] mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-16 h-16 mx-auto bg-rosa/10 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-rosa" />
            </div>
            <h2 className="text-titulo text-foreground">Conecte seu Google Calendar</h2>
            <p className="text-corpo text-muted-foreground max-w-sm">
              Veja seus compromissos e saiba em quanto tempo cada evento acontece.
            </p>
            {error && (
              <p className="text-pequeno text-destructive">{error}</p>
            )}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={cn(
                'px-6 py-3 bg-rosa text-white rounded-xl font-medium',
                'flex items-center gap-2 mx-auto transition-all',
                'hover:bg-rosa/90 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5" />
                  Conectar Google Calendar
                </>
              )}
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background pb-24">
      <Header
        primeiroNome={primeiroNome}
        onOpenConfig={onOpenConfig}
        onRefresh={fetchEvents}
        onDisconnect={handleDisconnect}
        isLoading={isLoading}
        isConnected={isConnected}
      />

      <main className="max-w-[720px] mx-auto p-4 space-y-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-rosa animate-spin" />
            <p className="text-corpo text-muted-foreground mt-4">Carregando eventos...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-corpo text-destructive">{error}</p>
            <button
              onClick={fetchEvents}
              className="mt-4 text-pequeno text-rosa hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && events.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-corpo text-muted-foreground">
              Nenhum evento nos próximos 7 dias
            </p>
          </div>
        )}

        {/* Lista de eventos agrupados por dia */}
        {!isLoading && !error && groupedEvents.length > 0 && (
          <AnimatePresence>
            {groupedEvents.map((group, groupIndex) => (
              <motion.div
                key={group.date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
                className="space-y-3"
              >
                {/* Label do dia */}
                <h3 className="text-corpo-medium text-foreground font-medium px-1 capitalize">
                  {group.label}
                </h3>

                {/* Eventos do dia */}
                <div className="space-y-2">
                  {group.events.map((event, eventIndex) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: groupIndex * 0.05 + eventIndex * 0.03 }}
                      className="bg-card border border-border rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-corpo font-medium text-foreground flex-1">
                          {event.title}
                        </h4>
                        <span className="text-pequeno bg-rosa/10 text-rosa px-2.5 py-1 rounded-full whitespace-nowrap">
                          {event.timeUntil}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-pequeno text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {event.isAllDay ? (
                            'Dia inteiro'
                          ) : (
                            <>
                              {formatDateTime(event.startTime, false)}
                              {event.endTime && ` - ${formatDateTime(event.endTime, false)}`}
                            </>
                          )}
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">{event.location}</span>
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-pequeno text-muted-foreground line-clamp-2 pt-1">
                          {event.description}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}

// Header component
interface HeaderProps {
  primeiroNome: string
  onOpenConfig: () => void
  onRefresh?: () => void
  onDisconnect?: () => void
  isLoading?: boolean
  isConnected?: boolean
}

function Header({ primeiroNome, onOpenConfig, onRefresh, onDisconnect, isLoading, isConnected }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-[720px] mx-auto">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            {/* Avatar com inicial */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-rosa to-rosa/80 text-white text-pequeno font-semibold">
              {primeiroNome.charAt(0).toUpperCase()}
            </div>
            <span className="text-corpo text-foreground font-medium">
              Lembretes
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Botão de atualizar */}
            {isConnected && onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl',
                  'text-muted-foreground hover:text-foreground hover:bg-accent',
                  'transition-colors active:scale-95',
                  'disabled:opacity-50'
                )}
                aria-label="Atualizar"
              >
                <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
              </button>
            )}

            {/* Botão de desconectar */}
            {isConnected && onDisconnect && (
              <button
                type="button"
                onClick={onDisconnect}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl',
                  'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                  'transition-colors active:scale-95'
                )}
                aria-label="Desconectar Google Calendar"
              >
                <Unlink className="w-5 h-5" />
              </button>
            )}

            {/* Botão de configurações */}
            <button
              type="button"
              onClick={onOpenConfig}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                'transition-colors active:scale-95'
              )}
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
