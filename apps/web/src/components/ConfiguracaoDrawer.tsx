/**
 * ConfiguracaoDrawer Component
 *
 * Drawer de configurações do usuário.
 * Permite alterar preferências como:
 * - Marcar entradas como recebidas automaticamente
 * - Marcar saídas como pagas automaticamente
 * - Mostrar itens concluídos com menos destaque
 *
 * Responsivo: drawer lateral em desktop, bottomsheet em mobile.
 */

import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTitle,
} from '@/components/ui/responsive-drawer'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

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
          {configs.map((config) => (
            <div
              key={config.chave}
              className="flex items-center justify-between gap-4 min-h-touch"
            >
              <div className="flex-1">
                <Label
                  htmlFor={config.chave}
                  className="text-corpo-medium text-neutro-900 cursor-pointer"
                >
                  {config.label}
                </Label>
                <p className="text-pequeno text-neutro-600 mt-0.5">
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
