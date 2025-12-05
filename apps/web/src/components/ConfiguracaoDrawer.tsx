/**
 * ConfiguracaoDrawer Component
 *
 * Drawer de configurações do usuário.
 * Permite alterar preferências como:
 * - Marcar entradas como recebidas automaticamente
 * - Marcar saídas como pagas automaticamente
 * - Mostrar itens concluídos com menos destaque
 * - Alternar entre tema claro/escuro
 *
 * Responsivo: drawer lateral em desktop, bottomsheet em mobile.
 */

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTitle,
} from '@/components/ui/responsive-drawer'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ConfiguracaoDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  configuracoes: Record<string, boolean | string | number>
  onUpdateConfig: (chave: string, valor: boolean) => void
}

export function ConfiguracaoDrawer({
  open,
  onOpenChange,
  configuracoes,
  onUpdateConfig,
}: ConfiguracaoDrawerProps) {
  const { theme, setTheme } = useTheme()

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ]

  const configs = [
    {
      chave: 'entradas_auto_recebido',
      label: 'Marcar entradas como recebidas',
      descricao: 'Novas entradas já vêm marcadas como recebidas',
    },
    {
      chave: 'saidas_auto_pago',
      label: 'Marcar saídas como pagas',
      descricao: 'Novas saídas já vêm marcadas como pagas',
    },
    {
      chave: 'mostrar_concluidos_discretos',
      label: 'Itens concluídos discretos',
      descricao: 'Mostrar itens concluídos com menos destaque',
    },
  ]

  return (
    <ResponsiveDrawer open={open} onOpenChange={onOpenChange}>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader>
          <ResponsiveDrawerTitle>Configurações</ResponsiveDrawerTitle>
        </ResponsiveDrawerHeader>

        <div className="space-y-6">
          {/* Seletor de Tema */}
          <div className="space-y-3">
            <div>
              <Label className="text-corpo-medium text-foreground">
                Aparência
              </Label>
              <p className="text-pequeno text-muted-foreground mt-0.5">
                Escolha o tema da interface
              </p>
            </div>
            <div className="flex gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isActive = theme === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      isActive
                        ? 'border-rosa bg-rosa/5 text-rosa'
                        : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/50'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-micro font-medium">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-border" />

          {/* Configurações de comportamento */}
          {configs.map((config) => (
            <div
              key={config.chave}
              className="flex items-center justify-between gap-4 min-h-touch"
            >
              <div className="flex-1">
                <Label
                  htmlFor={config.chave}
                  className="text-corpo-medium text-foreground cursor-pointer"
                >
                  {config.label}
                </Label>
                <p className="text-pequeno text-muted-foreground mt-0.5">
                  {config.descricao}
                </p>
              </div>
              <Switch
                id={config.chave}
                checked={Boolean(configuracoes[config.chave])}
                onCheckedChange={(checked) =>
                  onUpdateConfig(config.chave, checked)
                }
              />
            </div>
          ))}
        </div>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  )
}
