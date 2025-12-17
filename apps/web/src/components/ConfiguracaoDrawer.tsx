/**
 * ConfiguracaoDrawer Component
 *
 * Sheet de configurações modernizado com shadcn/ui.
 * Design atualizado com melhor organização e visual.
 */

import { 
  Moon, 
  Sun, 
  Monitor, 
  Settings2,
  Palette,
  Info
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

// Componentes shadcn/ui
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

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
    { 
      value: 'light', 
      label: 'Claro', 
      icon: Sun,
      description: 'Tema claro para o dia'
    },
    { 
      value: 'dark', 
      label: 'Escuro', 
      icon: Moon,
      description: 'Tema escuro para a noite'
    },
    { 
      value: 'system', 
      label: 'Sistema', 
      icon: Monitor,
      description: 'Seguir configuração do sistema'
    },
  ]

  const configGroups = [
    {
      id: 'comportamento',
      label: 'Comportamento',
      icon: Settings2,
      configs: [
        {
          chave: 'entradas_auto_recebido',
          label: 'Auto-marcar entradas',
          descricao: 'Novas entradas já vêm marcadas como recebidas',
          icon: '💰',
        },
        {
          chave: 'saidas_auto_pago',
          label: 'Auto-marcar saídas',
          descricao: 'Novas saídas já vêm marcadas como pagas',
          icon: '💳',
        },
      ],
    },
    {
      id: 'visual',
      label: 'Visual',
      icon: Palette,
      configs: [
        {
          chave: 'mostrar_concluidos_discretos',
          label: 'Itens concluídos discretos',
          descricao: 'Mostrar itens concluídos com menos destaque',
          icon: '👁️',
        },
      ],
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl font-semibold">
                Configurações
              </SheetTitle>
              <SheetDescription className="text-sm">
                Personalize sua experiência
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-6 space-y-8">
            {/* Seção: Aparência */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Aparência
                </Label>
              </div>
              
              <div className="grid gap-2">
                {themeOptions.map((option) => {
                  const Icon = option.icon
                  const isActive = theme === option.value
                  
                  return (
                    <motion.button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 transition-all text-left",
                        "hover:border-primary/50",
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isActive 
                            ? "bg-primary/10 text-primary" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {option.label}
                            </span>
                            {isActive && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Seções de configurações */}
            <Tabs defaultValue="comportamento" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10">
                {configGroups.map((group) => {
                  const Icon = group.icon
                  return (
                    <TabsTrigger
                      key={group.id}
                      value={group.id}
                      className="text-xs"
                    >
                      <Icon className="w-3 h-3 mr-1.5" />
                      {group.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {configGroups.map((group) => (
                <TabsContent
                  key={group.id}
                  value={group.id}
                  className="mt-4 space-y-4"
                >
                  {group.configs.map((config) => (
                    <motion.div
                      key={config.chave}
                      className="p-4 rounded-xl border bg-card/50 hover:bg-card transition-colors"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1">
                          <span className="text-lg mt-0.5">{config.icon}</span>
                          <div className="flex-1">
                            <Label
                              htmlFor={config.chave}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {config.label}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {config.descricao}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id={config.chave}
                          checked={Boolean(configuracoes[config.chave])}
                          onCheckedChange={(checked) =>
                            onUpdateConfig(config.chave, checked)
                          }
                        />
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>

            {/* Informações adicionais */}
            <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-dashed">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-medium">Dica</p>
                  <p className="text-xs text-muted-foreground">
                    Suas configurações são salvas automaticamente e sincronizadas em todos os dispositivos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}