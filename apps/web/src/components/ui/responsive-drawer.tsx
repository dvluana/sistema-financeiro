/**
 * ResponsiveDrawer Component
 *
 * Componente adaptativo que renderiza:
 * - Drawer lateral (direita) em desktop e tablets grandes (>= 1024px)
 * - BottomSheet em mobile e tablets pequenos (< 1024px)
 *
 * Usa a mesma API do Drawer do Vaul para facilitar a migração.
 */

import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsDesktop } from '@/hooks/useMediaQuery'

interface ResponsiveDrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const ResponsiveDrawer = ({ open, onOpenChange, children }: ResponsiveDrawerProps) => {
  const isDesktop = useIsDesktop()

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={isDesktop ? 'right' : 'bottom'}
      shouldScaleBackground={!isDesktop}
    >
      {children}
    </DrawerPrimitive.Root>
  )
}
ResponsiveDrawer.displayName = 'ResponsiveDrawer'

const ResponsiveDrawerTrigger = DrawerPrimitive.Trigger

const ResponsiveDrawerPortal = DrawerPrimitive.Portal

const ResponsiveDrawerClose = DrawerPrimitive.Close

const ResponsiveDrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/50', className)}
    {...props}
  />
))
ResponsiveDrawerOverlay.displayName = 'ResponsiveDrawerOverlay'

interface ResponsiveDrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  showCloseButton?: boolean
}

const ResponsiveDrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  ResponsiveDrawerContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => {
  const isDesktop = useIsDesktop()

  return (
    <ResponsiveDrawerPortal>
      <ResponsiveDrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 flex flex-col bg-card',
          isDesktop
            ? // Drawer lateral (desktop)
              'inset-y-0 right-0 h-full w-full max-w-md border-l border-border rounded-l-card'
            : // BottomSheet (mobile/tablet)
              'inset-x-0 bottom-0 mt-24 h-auto rounded-t-bottomsheet border-t border-border',
          className
        )}
        {...props}
      >
        {isDesktop ? (
          // Desktop: Header com botão de fechar
          <>
            {showCloseButton && (
              <div className="flex items-center justify-end p-4 border-b border-border">
                <DrawerPrimitive.Close className="rounded-full p-2 hover:bg-accent transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                  <span className="sr-only">Fechar</span>
                </DrawerPrimitive.Close>
              </div>
            )}
            <div className="flex-1 overflow-auto p-6">{children}</div>
          </>
        ) : (
          // Mobile: Handle de arraste
          <>
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted" />
            <div className="max-h-[90vh] overflow-auto p-6">{children}</div>
          </>
        )}
      </DrawerPrimitive.Content>
    </ResponsiveDrawerPortal>
  )
})
ResponsiveDrawerContent.displayName = 'ResponsiveDrawerContent'

const ResponsiveDrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isDesktop = useIsDesktop()

  return (
    <div
      className={cn(
        'grid gap-1.5 pb-4',
        isDesktop ? 'text-left' : 'text-center sm:text-left',
        className
      )}
      {...props}
    />
  )
}
ResponsiveDrawerHeader.displayName = 'ResponsiveDrawerHeader'

const ResponsiveDrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('mt-auto flex flex-col gap-2 pt-4', className)}
    {...props}
  />
)
ResponsiveDrawerFooter.displayName = 'ResponsiveDrawerFooter'

const ResponsiveDrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn('text-titulo-card text-foreground', className)}
    {...props}
  />
))
ResponsiveDrawerTitle.displayName = 'ResponsiveDrawerTitle'

const ResponsiveDrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-corpo text-muted-foreground', className)}
    {...props}
  />
))
ResponsiveDrawerDescription.displayName = 'ResponsiveDrawerDescription'

export {
  ResponsiveDrawer,
  ResponsiveDrawerPortal,
  ResponsiveDrawerOverlay,
  ResponsiveDrawerTrigger,
  ResponsiveDrawerClose,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
  ResponsiveDrawerFooter,
  ResponsiveDrawerTitle,
  ResponsiveDrawerDescription,
}
