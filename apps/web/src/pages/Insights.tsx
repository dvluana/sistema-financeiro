/**
 * Insights Page
 *
 * Tela de análises e gráficos com histórico de 6 meses.
 */

import { useEffect } from 'react'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MiniChart } from '@/components/MiniChart'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useAuthStore } from '@/stores/useAuthStore'

interface InsightsProps {
  onOpenConfig: () => void
}

export function Insights({ onOpenConfig }: InsightsProps) {
  const { usuario } = useAuthStore()
  const {
    historico,
    isLoading,
    carregarDashboard,
  } = useDashboardStore()

  useEffect(() => {
    carregarDashboard()
  }, [carregarDashboard])

  // Extrai nome do usuário (primeiro nome apenas)
  const primeiroNome = usuario?.nome?.split(' ')[0] || 'Usuário'

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[720px] mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              {/* Avatar com inicial */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-rosa to-rosa/80 text-white text-pequeno font-semibold">
                {primeiroNome.charAt(0).toUpperCase()}
              </div>
              <span className="text-corpo text-foreground font-medium">
                Insights
              </span>
            </div>

            <div className="flex items-center gap-1">
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

      {/* Conteúdo */}
      <main className="max-w-[720px] mx-auto p-4 space-y-4">
        {/* Gráfico dos últimos 6 meses */}
        <div className="space-y-3">
          <div className="px-1">
            <h2 className="text-corpo-medium text-foreground">
              Histórico dos últimos 6 meses
            </h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-end justify-between gap-3 h-[140px]">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-8 bg-muted rounded-t-md animate-pulse"
                        style={{ height: `${40 + Math.random() * 60}px` }}
                      />
                      <div className="h-4 w-8 bg-muted rounded mt-2 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ) : historico.length > 0 ? (
              <MiniChart dados={historico} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </div>
        </div>

        {/* Placeholder para futuras análises */}
        <div className="space-y-3">
          <div className="px-1">
            <h2 className="text-corpo-medium text-foreground">
              Mais insights em breve
            </h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-corpo">
              Novas análises e gráficos serão adicionados aqui.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
